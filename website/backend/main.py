import asyncio
import json
import logging
import os

from confluent_kafka import Consumer, KafkaError
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC = "binance.trades.raw"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_consumer() -> Consumer:
    return Consumer(
        {
            "bootstrap.servers": KAFKA_BROKER,
            "group.id": "fastapi-websocket",
            "auto.offset.reset": "latest",
        }
    )


@app.websocket("/ws/trades")
async def trades_websocket(websocket: WebSocket):
    await websocket.accept()
    log.info("WebSocket client connected")

    consumer = create_consumer()
    consumer.subscribe([KAFKA_TOPIC])

    try:
        while True:
            msg = await asyncio.get_event_loop().run_in_executor(
                None, lambda: consumer.poll(timeout=1.0)
            )
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                log.error(f"Kafka error: {msg.error()}")
                break

            data = json.loads(msg.value().decode("utf-8"))
            await websocket.send_json(data)

    except WebSocketDisconnect:
        log.info("WebSocket client disconnected")
    finally:
        consumer.close()


@app.get("/health")
def health():
    return {"status": "ok"}