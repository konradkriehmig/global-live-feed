FROM apache/spark-py:v3.5.0

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt --break-system-packages

COPY jobs/earthquake_spark_transform.py .
COPY jobs/binance_spark_transform.py .