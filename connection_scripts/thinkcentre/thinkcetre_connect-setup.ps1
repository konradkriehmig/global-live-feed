az acr login --name acrgloballivefeed
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/thinkcentre-connection:latest --push connection_scripts/thinkcentre
kubectl apply -f connection_scripts/thinkcentre/thinkcentre.yaml

#for changes:
kubectl rollout restart deployment/thinkcentre-connection

kubectl get pods