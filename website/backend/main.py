import os
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import binance, earthquakes

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
BINANCE_TOPIC = "binance.trades.raw"
EARTHQUAKE_TOPIC =  "usgs.earthquakes.raw"
THINKCENTRE_TOPIC = "thinkcentre.metrics.raw"

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

app.include_router(binance.router)
app.include_router(earthquakes.router)

@app.get("/health")
def health():
    return {"status": "ok"}