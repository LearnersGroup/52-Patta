# Infrastructure Roadmap

A sequential list of infrastructure tasks. Each builds on the previous — complete them in order before scaling features.

---

## ✅ Task 1 — iOS Versioning Strategy & Staging Infrastructure
**Branch:** `chore/ios-versioning-staging-infra`

- Switched `appVersionSource` to `"local"` — `app.json` is now the version source of truth
- Synced `app.json` + `package.json` version to `1.0.9`
- `preview` EAS profile points to `staging.52patta.in`, `production` points to `52patta.in`
- TestFlight submit gated to `production` profile only
- Terraform: added Route 53 `aws_route53_record` for `staging.52patta.in`

---

## ⏳ Task 2 — DNS Migration: GoDaddy → Route 53
**Depends on:** Task 1

**Why:** Single source of truth for DNS. Terraform automatically manages `staging.52patta.in` on every `apply`/`destroy` — no manual DNS updates when cycling the staging environment. Cheaper than a permanent EIP when staging is down 20+ days/month.

**Steps:**
1. Create Route 53 hosted zone for `52patta.in` manually in AWS Console (one-time — shared by prod and staging, must never be destroyed)
2. Add `52patta.in` and `www.52patta.in` A records → `15.156.57.107` (current prod IP)
3. Replace GoDaddy nameservers with the 4 Route 53 nameservers
4. Verify with `dig 52patta.in +short`
5. Paste hosted zone ID into `terraform/staging.tfvars`

**After this:** `terraform apply -var-file=staging.tfvars` creates staging EC2 + EIP + `staging.52patta.in` DNS record in one shot. `terraform destroy` removes all three.

---

## ⏳ Task 3 — Terraform Environment Isolation (prod + staging separate state)
**Depends on:** Task 2

**Why:** The current `terraform.tfstate` tracks the prod server under staging state (it was created with `staging.tfvars`). This means a `terraform destroy -var-file=staging.tfvars` could accidentally destroy prod. Before any load balancing or scaling work, prod must be under its own isolated Terraform state.

**What changes:**
```
terraform/
├── environments/
│   ├── prod/
│   │   ├── terraform.tfstate    ← prod state, completely isolated
│   │   └── prod.tfvars
│   └── staging/
│       ├── terraform.tfstate    ← staging state, completely isolated
│       └── staging.tfvars
```

**Key step — import existing prod server without recreating it:**
```bash
cd terraform/environments/prod
terraform import -var-file=prod.tfvars aws_instance.app i-05c0c5f8b10a88311
terraform import -var-file=prod.tfvars aws_eip.app eipalloc-078cac6a213077cda
```

**After this:** `terraform apply -var-file=prod.tfvars` safely manages prod infra. Adding load balancers, autoscaling groups, or multiple EC2s is a Terraform change — no manual work.

---

## ⏳ Task 4 — Staging Server Setup (nginx + SSL + env)
**Depends on:** Task 2

**Why:** The staging EC2 spun up by Terraform is a blank server with only Docker installed. It needs the app stack running before preview builds can test against it.

**What needs to happen after `terraform apply -var-file=staging.tfvars`:**
1. SSH into the new staging instance
2. Clone the repo + copy `.env` (staging values: `JWT_SECRET`, `MONGO_HOST`, `CORS_ORIGINS=https://staging.52patta.in`)
3. Get SSL cert: `certbot certonly --standalone -d staging.52patta.in`
4. Add `staging.52patta.in` server block to `nginx/nginx.conf`
5. `docker-compose up -d`

**Goal:** Automate this via a `user_data` bootstrap script or a GitHub Actions deploy-staging workflow so spinning up staging is one command.

---

## ⏳ Task 5 — Production Deploy Workflow
**Depends on:** Task 3

**Why:** Currently production deploys are manual (SSH + pull + restart). With prod under proper Terraform state and a clean CI/CD pipeline, deploys should be one-click from GitHub Actions.

**What to build:**
- `deploy-prod.yml` GitHub Actions workflow triggered on version tag push (`v*`)
- Builds Docker image → pushes to ECR → SSHes into prod EC2 → pulls + restarts

---

## The Payoff

Once Tasks 1–4 are done:
```
Feature development loop:
1. Build feature on a branch
2. Merge to main
3. trigger ship-ios (preview) → test on staging.52patta.in
4. trigger ship-ios (production) → ships to TestFlight
5. terraform destroy staging → zero idle cost until next cycle
```

No manual server work. No manual DNS updates. Rapid feature iteration.
