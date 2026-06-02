# Install cert-manager (required by Flink operator)
kubectl create -f https://github.com/jetstack/cert-manager/releases/download/v1.8.2/cert-manager.yaml

# Install Flink operator
helm repo add flink-operator-repo https://archive.apache.org/dist/flink/flink-kubernetes-operator-1.15.0/
helm repo update
helm install flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator --namespace flink --create-namespace --set webhook.create=false

kubectl get pods --namespace flink