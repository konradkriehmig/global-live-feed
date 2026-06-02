az acr login --name acrgloballivefeed

docker build -t acrgloballivefeed.azurecr.io/binance-connector:latest connection_scripts/binance
docker push acrgloballivefeed.azurecr.io/binance-connector:latest