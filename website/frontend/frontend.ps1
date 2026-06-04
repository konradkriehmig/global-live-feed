npx create-react-app frontend

cd website/frontend
npm install three

npm run build

docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .

kubectl apply -f frontend.yaml
kubectl get svc frontend

#rebuild
cd website/frontend
npm run build
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .
kubectl rollout restart deployment/frontend