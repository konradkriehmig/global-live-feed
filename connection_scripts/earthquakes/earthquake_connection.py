import time
import json
import os
import requests
from confluent_kafka import Producer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka-kafka-bootstrap.kafka.svc.cluster.local:9092")
KAFKA_TOPIC = "usgs.earthquakes.raw"
USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
POLL_INTERVAL = 60

producer = Producer({"bootstrap.servers": KAFKA_BROKER})
seen = set()

while True:
    data = requests.get(USGS_URL, timeout=10).json()

    for feature in data["features"]:
        event_id = feature["id"]
        if event_id in seen:
            continue
        seen.add(event_id)

        props = feature["properties"]
        coords = feature["geometry"]["coordinates"]

        earthquake = {
            "id": event_id,
            "magnitude": props["mag"],
            "place": props["place"],
            "longitude": coords[0],
            "latitude": coords[1],
            "depth": coords[2],
            "event_ts": props["time"],
        }
        producer.produce(KAFKA_TOPIC, value=json.dumps(earthquake))

    producer.flush()
    time.sleep(POLL_INTERVAL)