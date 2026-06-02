az acr login --name acrgloballivefeed

docker build -t acrgloballivefeed.azurecr.io/binance-connector:latest connection_scripts/binance
docker push acrgloballivefeed.azurecr.io/binance-connector:latest

kubectl apply -f connection_scripts/binance/binance_connector.yaml

kubectl get pods