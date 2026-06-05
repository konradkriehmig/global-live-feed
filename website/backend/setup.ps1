az acr login --name acrgloballivefeed

docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/backend:latest --push website/backend

kubectl apply -f website/backend/backend.yaml
kubectl get pods
kubectl get svc

cd website/backend
az acr login --name acrgloballivefeed
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/backend:latest --push .
kubectl rollout restart deployment/backend