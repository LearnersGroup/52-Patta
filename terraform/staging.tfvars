environment    = "staging"
aws_region     = "ca-central-1"
instance_type  = "t3.micro"
ami_id         = "ami-0f435c88087d8e0de" # Amazon Linux 2023 in ca-central-1
key_pair_name  = "52-patta-staging" # Create this key pair in AWS first

# DNS — set route53_zone_id to the hosted zone ID for 52patta.in to create staging.52patta.in
create_dns_record = true
dns_subdomain     = "staging"
route53_zone_id   = "Z0857890275T8MW0TUB4F" # e.g. Z0123456789ABCDEFGHIJ
