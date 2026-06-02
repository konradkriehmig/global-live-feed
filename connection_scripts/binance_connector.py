import asyncio
import json
import logging
import os
import requests
import websockets

from confluent_kafka import Producer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC = "binance.trades.raw"
BINANCE_REST_URL = "https://api.binance.com/api/v3/exchangeInfo"
BINANCE_WS_BASE = "wss://stream.binance.com:9443/stream?streams="
MAX_STREAMS_PER_CONNECTION = 200


def get_usdt_pairs() -> list[str]:
    log.info("Fetching active USDT pairs from Binance REST API...")
    response = requests.get(BINANCE_REST_URL, timeout=10)
    response.raise_for_status()
    symbols = response.json()["symbols"]
    pairs = [
        s["symbol"].lower()
        for s in symbols
        if s["quoteAsset"] == "USDT" and s["status"] == "TRADING"
    ]
    log.info(f"Found {len(pairs)} active USDT pairs")
    return pairs


def build_stream_urls(pairs: list[str]) -> list[str]:
    streams = [f"{pair}@trade" for pair in pairs]
    chunks = [
        streams[i : i + MAX_STREAMS_PER_CONNECTION]
        for i in range(0, len(streams), MAX_STREAMS_PER_CONNECTION)
    ]
    return [BINANCE_WS_BASE + "/".join(chunk) for chunk in chunks]


def delivery_report(err, msg):
    if err:
        log.error(f"Kafka delivery failed: {err}")


async def stream(url: str, producer: Producer):
    log.info(f"Connecting to WebSocket: {url[:80]}...")
    async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
        async for raw in ws:
            data = json.loads(raw)
            trade = data.get("data", {})
            message = {
                "source": "binance",
                "symbol": trade.get("s"),
                "price": trade.get("p"),
                "quantity": trade.get("q"),
                "side": "buy" if trade.get("m") is False else "sell",
                "event_ts": trade.get("T"),
            }
            producer.produce(
                KAFKA_TOPIC,
                key=message["symbol"],
                value=json.dumps(message),
                callback=delivery_report,
            )
            producer.poll(0)


async def main():
    pairs = get_usdt_pairs()
    urls = build_stream_urls(pairs)
    log.info(f"Opening {len(urls)} WebSocket connection(s)")

    producer = Producer({"bootstrap.servers": KAFKA_BROKER})

    await asyncio.gather(*[stream(url, producer) for url in urls])


if __name__ == "__main__":
    asyncio.run(main())