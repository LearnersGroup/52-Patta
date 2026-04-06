environment       = "production"      # EC2 tag: 52-patta-production (matches deploy-prod.yml)
instance_type     = "t3.small"
key_pair_name     = "52-patta-prod"   # Create this key pair in AWS first
ssh_allowed_cidrs = ["YOUR.IP.HERE/32"] # CHANGE to your IP address

# Root domain DNS is managed manually in Route 53 (not via Terraform)
# — 52patta.in and www.52patta.in A records were added directly in the console
create_dns_record = false
