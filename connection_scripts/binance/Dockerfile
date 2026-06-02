FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY binance_connector.py .

CMD ["python", "binance_connector.py"]