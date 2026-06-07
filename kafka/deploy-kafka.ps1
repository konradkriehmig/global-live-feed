winget install Helm.Helm
az aks get-credentials --resource-group rg-globallivefeed-prod-westeu --name aks-globallivefeed-prod-westeu

helm uninstall kafka --namespace kafka

helm repo add strimzi https://strimzi.io/charts/
helm repo update
helm install strimzi strimzi/strimzi-kafka-operator --namespace kafka --create-namespace

kubectl get pods --all-namespaces
kubectl get pods --namespace kafka

kubectl get crds | Select-String "strimzi"

kubectl apply -f infra\kafka\kafka.yaml

#open kafka gui
kubectl port-forward svc/kafka-ui 8080:80 --namespace kafka