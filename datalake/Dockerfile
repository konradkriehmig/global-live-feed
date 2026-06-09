FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY kafka-datalake-connection.py .

CMD ["python", "kafka-datalake-connection.py"]