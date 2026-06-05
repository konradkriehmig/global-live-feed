import asyncio
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor

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

executor = ThreadPoolExecutor(max_workers=10)


def poll_kafka(consumer):
    return consumer.poll(timeout=0.5)


@app.websocket("/ws/trades")
async def trades_websocket(websocket: WebSocket):
    await websocket.accept()
    log.info("WebSocket client connected")

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": f"fastapi-ws-{id(websocket)}",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([KAFKA_TOPIC])

    loop = asyncio.get_event_loop()

    try:
        while True:
            msg = await loop.run_in_executor(executor, poll_kafka, consumer)

            if msg is None:
                await websocket.send_json({"type": "ping"})
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
    except Exception as e:
        log.error(f"Error: {e}")
    finally:
        consumer.close()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws/earthquakes")
async def earthquakes_websocket(websocket: WebSocket):
    await websocket.accept()
    log.info("Earthquake WebSocket client connected")

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": f"fastapi-eq-{id(websocket)}",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe(["usgs.earthquakes.raw"])

    loop = asyncio.get_event_loop()

    try:
        while True:
            msg = await loop.run_in_executor(executor, poll_kafka, consumer)
            if msg is None:
                await websocket.send_json({"type": "ping"})
                continue
            if msg.error():
                continue
            data = json.loads(msg.value().decode("utf-8"))
            await websocket.send_json(data)
    except WebSocketDisconnect:
        log.info("Earthquake WebSocket disconnected")
    finally:
        consumer.close()