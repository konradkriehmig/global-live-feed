python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

winget install Helm.Helm
az aks get-credentials --resource-group rg-globallivefeed-prod-westeu --name aks-globallivefeed-prod-westeu

helm uninstall kafka --namespace kafka

helm repo add strimzi https://strimzi.io/charts/
helm repo update
helm install strimzi strimzi/strimzi-kafka-operator --namespace kafka --create-namespace

kubectl get pods --all-namespaces
kubectl get pods --namespace kafka