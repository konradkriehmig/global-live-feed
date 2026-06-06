from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from confluent_kafka import Consumer
import json
import asyncio
from config import KAFKA_BROKER, EARTHQUAKE_TOPIC, executor, poll_kafka

router = APIRouter()

@router.websocket("/ws/earthquakes")
async def earthquakes_websocket(websocket: WebSocket):
    await websocket.accept()

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": f"fastapi-eq-{id(websocket)}",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([EARTHQUAKE_TOPIC])

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
    except WebSocketDisconnect:
        pass
    finally:
        consumer.close()