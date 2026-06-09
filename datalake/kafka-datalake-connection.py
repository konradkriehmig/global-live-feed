from confluent_kafka import Consumer
import pandas as pd
import os
import json
import io
from datetime import datetime
from azure.identity import DefaultAzureCredential
from azure.storage.filedatalake import DataLakeServiceClient

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPICS = ["binance.trades.raw", "usgs.earthquakes.raw", "thinkcentre.metrics.raw"]
STORAGE_ACCOUNT_NAME = "sagloballivefeed"
CONTAINER_NAME = "datalake"
FLUSH_INTERVAL_SECONDS = 300  # flush every 5 minutes

consumer = Consumer({
    "bootstrap.servers": KAFKA_BROKER,
    "group.id": "datalake-archiver",
    "auto.offset.reset": "earliest"
})
consumer.subscribe(KAFKA_TOPICS)

service_client = DataLakeServiceClient(
    account_url=f"https://{STORAGE_ACCOUNT_NAME}.dfs.core.windows.net",
    credential=DefaultAzureCredential()
)


def store(messages, topic):
    df = pd.DataFrame(messages)

    buffer = io.BytesIO()
    df.to_parquet(buffer, index=False)
    buffer.seek(0)

    now = datetime.utcnow()
    path = f"raw/{topic}/year={now.year}/month={now.month:02d}/day={now.day:02d}/{now.strftime('%H%M%S')}.parquet"

    file_client = service_client.get_file_client(
        file_system=CONTAINER_NAME,
        file_path=path
    )
    file_client.upload_data(buffer.read(), overwrite=True)
    print(f"Stored {len(messages)} messages from {topic} to {path}")


messages = {
    "binance.trades.raw": [],
    "usgs.earthquakes.raw": [],
    "thinkcentre.metrics.raw": []
}
last_flush = datetime.utcnow()

while True:
    message = consumer.poll(timeout=1)
    if message is not None and not message.error():
        topic = message.topic()
        messages[topic].append(json.loads(message.value().decode("utf-8")))

    now = datetime.utcnow()
    if (now - last_flush).seconds >= FLUSH_INTERVAL_SECONDS:
        for topic in KAFKA_TOPICS:
            if messages[topic]:
                store(messages[topic], topic)
                messages[topic] = []
        last_flush = now