environment       = "production"      # EC2 tag: 52-patta-production (matches deploy-prod.yml)
instance_type     = "t3.micro"
key_pair_name     = "52-patta-staging" # existing key pair on the server
ssh_allowed_cidrs = ["0.0.0.0/0"]

# Root domain DNS is managed manually in Route 53 (not via Terraform)
# — 52patta.in and www.52patta.in A records were added directly in the console
create_dns_record = false
