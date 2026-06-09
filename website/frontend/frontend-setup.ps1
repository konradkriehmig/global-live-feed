npx create-react-app frontend

cd website/frontend
npm install three

npm run build

docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .

kubectl apply -f frontend.yaml
kubectl get svc frontend

#rebuild
az acr login --name acrgloballivefeed
cd website/frontend
npm run build
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .
kubectl rollout restart deployment/frontend

#test on local laptop
cd website/frontend
npm start
