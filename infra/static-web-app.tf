resource "azurerm_static_web_app" "main" {
  name                = "stapp-globallivefeed-prod-westeu"
  resource_group_name = azurerm_resource_group.rg.name
  location            = "westeurope"
  sku_tier            = "Free"
  sku_size            = "Free"
}

output "static_web_app_url" {
  value = azurerm_static_web_app.main.default_host_name
}

output "static_web_app_token" {
  value     = azurerm_static_web_app.main.api_key
  sensitive = true
}