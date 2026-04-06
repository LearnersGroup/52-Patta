# Terraform Migration Guide

## What changed

Terraform has been restructured from a single flat directory into isolated environment directories:

```
terraform/
├── environments/
│   ├── prod/       ← manages production EC2 (52-patta-production)
│   └── staging/    ← manages staging EC2 (52-patta-staging)
└── (root files)    ← DEPRECATED — do not use for new applies
```

Each environment has its own `terraform.tfstate`, so `terraform destroy` in staging
cannot accidentally touch production resources.

---

## How to use going forward

```bash
# Staging — spin up
cd terraform/environments/staging
terraform init
terraform apply -var-file=staging.tfvars

# Staging — tear down
terraform destroy -var-file=staging.tfvars

# Production — managed separately, never destroyed
cd terraform/environments/prod
terraform init
terraform plan -var-file=prod.tfvars
```

---

## One-time migration: import existing prod server into prod state

The current production server (`i-05c0c5f8b10a88311`, EIP `eipalloc-078cac6a213077cda`)
was created with the old root staging config. It needs to be imported into the prod
environment state so Terraform can manage it going forward.

**Before running these commands:**
1. Update `prod.tfvars` with your SSH key name and IP
2. Run `terraform init` in `environments/prod/`
3. Then run the imports:

```bash
cd terraform/environments/prod

# Import VPC (replace with your VPC ID from terraform.tfstate)
terraform import -var-file=prod.tfvars aws_vpc.main vpc-08ffff62c95c00974

# Import Internet Gateway
terraform import -var-file=prod.tfvars aws_internet_gateway.main igw-0214ece2b0f9ba608

# Import Subnet
terraform import -var-file=prod.tfvars aws_subnet.public subnet-0f6a31bc00fd48e42

# Import Route Table
terraform import -var-file=prod.tfvars aws_route_table.public rtb-006f401a0e5a2dbff

# Import Route Table Association
terraform import -var-file=prod.tfvars aws_route_table_association.public rtbassoc-01647e9a1a74c809a

# Import Security Group
terraform import -var-file=prod.tfvars aws_security_group.app sg-08688b3d5683ce7f3

# Import EC2 instance
terraform import -var-file=prod.tfvars aws_instance.app i-05c0c5f8b10a88311

# Import Elastic IP
terraform import -var-file=prod.tfvars aws_eip.app eipalloc-078cac6a213077cda
```

After importing, run `terraform plan -var-file=prod.tfvars` — it should show
**0 changes** if the import succeeded cleanly. If there are diffs, review them
carefully before applying.

**Important:** The existing instance is tagged `52-patta-staging`. After import,
`terraform apply -var-file=prod.tfvars` will rename it to `52-patta-production`
(since `environment = "production"` in prod.tfvars). This rename is safe and
required for `deploy-prod.yml` to find the instance by tag.

---

## Staging state

The staging environment creates a **new** EC2 instance when you run
`terraform apply -var-file=staging.tfvars`. It is completely separate from
the prod instance. The old root `terraform.tfstate` is no longer used.
