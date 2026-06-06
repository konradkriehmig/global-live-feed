import os
from concurrent.futures import ThreadPoolExecutor

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
BINANCE_TOPIC = "binance.trades.raw"
EARTHQUAKE_TOPIC = "usgs.earthquakes.raw"
THINKCENTRE_TOPIC = "thinkcentre.metrics.raw"

executor = ThreadPoolExecutor(max_workers=10)

def poll_kafka(consumer):
    return consumer.poll(timeout=0.5)