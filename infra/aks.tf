terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-globallivefeed-prod-westeu"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-globallivefeed-prod-westeu"
  kubernetes_version  = "1.29"

  default_node_pool {
    name                = "agentpool"
    vm_size             = "Standard_D8ds_v5"
    os_sku              = "Ubuntu"
    min_count           = 2
    max_count           = 5
    enable_auto_scaling = true
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }
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
}

resource "azurerm_container_registry" "main" {
  name                = "acrgloballivefeed"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
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
