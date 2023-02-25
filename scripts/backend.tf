terraform {
    # Uncomment this to get it running in the CD pipeline.
    backend "azurerm" {
        resource_group_name  = "SoftwareArch"
        storage_account_name = "tanin"
        container_name       = "statesaver"
        key                  = "terraform.tfstate"
    }
}