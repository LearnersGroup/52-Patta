variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "52-patta"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Amazon Machine Image ID (Amazon Linux 2023)"
  type        = string
  default     = "ami-0f435c88087d8e0de" # Amazon Linux 2023 in ca-central-1
}

variable "key_pair_name" {
  description = "Name of the SSH key pair for EC2 access"
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH (restrict to your IP in production)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CHANGE THIS to your IP
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for 52patta.in (required when create_dns_record = true)"
  type        = string
  default     = ""
}

variable "create_dns_record" {
  description = "Whether to create a Route 53 A record for this environment"
  type        = bool
  default     = false
}

variable "dns_subdomain" {
  description = "Subdomain to create under 52patta.in (e.g. 'staging' creates staging.52patta.in)"
  type        = string
  default     = ""
}
