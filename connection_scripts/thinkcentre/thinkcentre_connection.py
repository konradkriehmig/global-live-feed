import time
import json
import os
import requests
from confluent_kafka import Producer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka-kafka-bootstrap.kafka.svc.cluster.local:9092")
KAFKA_TOPIC = "thinkcentre.metrics.raw"
NODE_EXPORTER_URL = "https://metrics.konradkriehmig.dev/metrics"
POLL_INTERVAL = 1

producer = Producer({"bootstrap.servers": KAFKA_BROKER})

METRICS = [
    "node_cpu_seconds_total",
    "node_memory_MemAvailable_bytes",
    "node_memory_MemTotal_bytes",
    "node_memory_MemFree_bytes",
    "node_memory_Buffers_bytes",
    "node_memory_Cached_bytes",
    "node_memory_SwapTotal_bytes",
    "node_memory_SwapFree_bytes",
    "node_network_receive_bytes_total",
    "node_network_transmit_bytes_total",
    "node_network_receive_packets_total",
    "node_network_transmit_packets_total",
    "node_network_receive_errs_total",
    "node_network_transmit_errs_total",
    "node_disk_read_bytes_total",
    "node_disk_written_bytes_total",
    "node_disk_reads_completed_total",
    "node_disk_writes_completed_total",
    "node_disk_io_time_seconds_total",
    "node_hwmon_temp_celsius",
    "node_load1",
    "node_load5",
    "node_load15",
    "node_procs_running",
    "node_procs_blocked",
    "node_context_switches_total",
    "node_intr_total",
    "node_filesystem_size_bytes",
    "node_filesystem_free_bytes",
    "node_filesystem_avail_bytes",
    "node_boot_time_seconds",
    "node_time_seconds",
]

def parse_metrics(text):
    result = {}
    for line in text.splitlines():
        if line.startswith("#"):
            continue
        for metric in METRICS:
            if line.startswith(metric):
                parts = line.rsplit(" ", 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip()
                    result[key] = float(value)
    return result

while 1:
    try:
        response = requests.get(NODE_EXPORTER_URL, timeout=10)
    except requests.exceptions.Timeout:
        time.sleep(5)
        continue
    metrics = parse_metrics(response.text)

    message = {
        "source": "thinkcentre",
        "event_ts": int(time.time() * 1000),
        "metrics": metrics,
    }

    producer.produce(KAFKA_TOPIC, value=json.dumps(message))
    producer.flush()
    time.sleep(POLL_INTERVAL)