python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

az acr login --name acrgloballivefeed

docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/binance-connector:latest --push connection_scripts/binance

kubectl apply -f connection_scripts/binance/binance_connector.yaml

kubectl get pods
