resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-globallivefeed-prod-westeu"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "aks-globallivefeed-prod-westeu-dns"
  kubernetes_version  = "1.34.7"

  default_node_pool {
    name                = "agentpool"
    vm_size             = "Standard_D8ds_v5"
    os_sku              = "Ubuntu"
    min_count           = 2
    max_count           = 5
    enable_auto_scaling = true
    max_pods            = 110
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_policy      = "cilium"
    network_data_plane  = "cilium"
    load_balancer_sku   = "standard"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  image_cleaner_enabled        = true
  image_cleaner_interval_hours = 168
}

resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "userpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D8ds_v5"
  os_sku                = "Ubuntu"
  mode                  = "User"
  min_count             = 2
  max_count             = 100
  enable_auto_scaling   = true
  max_pods              = 110
}

resource "azurerm_container_registry" "main" {
  name                = "acrgloballivefeed"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Standard"
  admin_enabled       = false
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main.id
  skip_service_principal_aad_check = true
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}
