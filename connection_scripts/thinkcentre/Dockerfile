FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY thinkcentre_connection.py .

CMD ["python", "thinkcentre_connection.py"]