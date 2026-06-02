npx create-react-app frontend

# Install Three.js
cd website/frontend
npm install three

# Build React app
npm run build

# Build and push Docker image
docker buildx build --platform linux/amd64 -t acrgloballivefeed.azurecr.io/frontend:latest --push .

kubectl apply -f frontend.yaml
kubectl get svc frontend