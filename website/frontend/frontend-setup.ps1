cd website/frontend
npm run build
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .
kubectl rollout restart deployment/frontend