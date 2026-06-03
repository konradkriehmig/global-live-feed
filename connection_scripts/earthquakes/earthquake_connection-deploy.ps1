az acr login --name acrgloballivefeed

docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/earthquake_connection:latest --push connection_scripts/earthquakes

kubectl apply -f connection_scripts/earthquakes/earthquake_connection.yaml

kubectl get pods
