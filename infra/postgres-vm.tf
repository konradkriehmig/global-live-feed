variable "admin_password" {
  type = string
}

resource "azurerm_virtual_network" "postgres" {
  name                = "vnet-postgres-prod-westeu"
  location            = "westeurope"
  resource_group_name = "rg-globallivefeed-prod-westeu"
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_subnet" "postgres" {
  name                 = "snet-postgres-prod-westeu"
  resource_group_name  = "rg-globallivefeed-prod-westeu"
  virtual_network_name = azurerm_virtual_network.postgres.name
  address_prefixes     = ["10.1.0.0/24"]
}

resource "azurerm_network_security_group" "postgres" {
  name                = "nsg-postgres-prod-westeu"
  location            = "westeurope"
  resource_group_name = "rg-globallivefeed-prod-westeu"

  security_rule {
    name                       = "Postgres"
    priority                   = 300
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = "10.224.0.0/12"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "postgres" {
  subnet_id                 = azurerm_subnet.postgres.id
  network_security_group_id = azurerm_network_security_group.postgres.id
}

resource "azurerm_network_interface" "postgres" {
  name                           = "nic-postgres-prod-westeu"
  location                       = "westeurope"
  resource_group_name            = "rg-globallivefeed-prod-westeu"
  accelerated_networking_enabled = true

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = azurerm_subnet.postgres.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_managed_disk" "postgres_data" {
  name                 = "disk-postgres-data-prod-westeu"
  location             = "westeurope"
  resource_group_name  = "rg-globallivefeed-prod-westeu"
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 1024
}

resource "azurerm_linux_virtual_machine" "postgres" {
  name                            = "vm-postgres-prod-westeu"
  location                        = "westeurope"
  resource_group_name             = "rg-globallivefeed-prod-westeu"
  size                            = "Standard_D2s_v3"
  admin_username                  = "azureuser"
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.postgres.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  vtpm_enabled        = true
  secure_boot_enabled = true

  boot_diagnostics {}
}

resource "azurerm_virtual_machine_data_disk_attachment" "postgres_data" {
  managed_disk_id    = azurerm_managed_disk.postgres_data.id
  virtual_machine_id = azurerm_linux_virtual_machine.postgres.id
  lun                = 0
  caching            = "ReadOnly"
}

output "postgres_private_ip" {
  value = azurerm_network_interface.postgres.private_ip_address
}