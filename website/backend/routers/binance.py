from fastapi import APIRouter, WebSocket
from main import KAFKA_BROKER, BINANCE_TOPIC, executor, poll_kafka
from confluent_kafka import Consumer
import asyncio
import json

router = APIRouter()

@router.websocket("/ws/binance")
async def binance_websocket(websocket: WebSocket):
    await websocket.accept()

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": f"fastapi-ws{id(websocket)}"
    })
    consumer.subscribe([BINANCE_TOPIC])

    loop = asyncio.get_running_loop()

    try:
        while True:
            msg = await loop.run_in_executor(executor, poll_kafka, consumer)
            if msg is None:
                await websocket.send_json({"type": "ping"})
                continue
            if msg.error():
                continue
            await websocket.send_json(json.loads(msg.value().decode("utf-8")))
    except Exception:
        pass
    finally:
        consumer.close()