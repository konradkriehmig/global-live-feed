FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY earthquake_connection.py .

CMD ["python", "earthquake_connection.py"]