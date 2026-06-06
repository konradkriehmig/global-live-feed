variable "ssh_public_key" {
  type = string
}

admin_ssh_key {
  username   = "azureuser"
  public_key = var.ssh_public_key
}

resource "azurerm_public_ip" "postgres" {
  name                = "postgres-vm-globallivefeed-prod-westeu-ip"
  location            = "westeurope"
  resource_group_name = "rg-globallivefeed-prod-westeu"
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_security_group" "postgres" {
  name                = "postgres-vm-globallivefeed-prod-westeu-nsg"
  location            = "westeurope"
  resource_group_name = "rg-globallivefeed-prod-westeu"

  security_rule {
    name                       = "SSH"
    priority                   = 300
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Postgres"
    priority                   = 310
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = "10.224.0.0/12"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "postgres" {
  name                          = "postgres-vm-globallivefeed-prod-westeu-nic"
  location                      = "westeurope"
  resource_group_name           = "rg-globallivefeed-prod-westeu"
  accelerated_networking_enabled = true

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = "/subscriptions/8d9e4373-f610-460e-8c58-e1dc091ba829/resourceGroups/mc_rg-globallivefeed-prod-westeu_aks-globallivefeed-prod-westeu_westeurope/providers/Microsoft.Network/virtualNetworks/aks-vnet-40127254/subnets/subnet-postgres-vm"
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.postgres.id
  }
}

resource "azurerm_network_interface_security_group_association" "postgres" {
  network_interface_id      = azurerm_network_interface.postgres.id
  network_security_group_id = azurerm_network_security_group.postgres.id
}

resource "azurerm_managed_disk" "postgres_data" {
  name                 = "postgres-vm-globallivefeed-prod-westeu-datadisk"
  location             = "westeurope"
  resource_group_name  = "rg-globallivefeed-prod-westeu"
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 1024
}

resource "azurerm_linux_virtual_machine" "postgres" {
  name                  = "postgres-vm-globallivefeed-prod-westeu"
  location              = "westeurope"
  resource_group_name   = "rg-globallivefeed-prod-westeu"
  size                  = "Standard_D2s_v3"
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.postgres.id]

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

output "postgres_vm_public_ip" {
  value = azurerm_public_ip.postgres.ip_address
}
