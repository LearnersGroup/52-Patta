variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "52-patta"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Amazon Machine Image ID (Amazon Linux 2023)"
  type        = string
  default     = "ami-0c101f26f147fa7fd" # Amazon Linux 2023 in us-east-2
}

variable "key_pair_name" {
  description = "Name of the SSH key pair for EC2 access"
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH (restrict to your IP)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CHANGE THIS to your IP in production
}
