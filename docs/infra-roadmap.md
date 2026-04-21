# Infrastructure Roadmap

A sequential list of infrastructure tasks. Each builds on the previous — complete them in order before scaling features.

---

## ✅ Task 1 — iOS Versioning Strategy & Staging Infrastructure
**Branch:** `chore/ios-versioning-staging-infra`

- Switched `appVersionSource` to `"local"` — `app.json` is now the version source of truth
- Synced `app.json` + `package.json` version to `1.0.9`
- `preview` EAS profile points to `staging.52patta.in`, `production` points to `52patta.in`
- Preview builds submit to TestFlight "Internal Testers" group; production to default group
- Terraform: added Route 53 `aws_route53_record` for `staging.52patta.in`

---

## ✅ Task 2 — DNS Migration: GoDaddy → Route 53
**Branch:** `chore/ios-versioning-staging-infra`

- Route 53 hosted zone created for `52patta.in` (Zone ID: `Z0857890275T8MW0TUB4F`)
- `52patta.in` and `www.52patta.in` A records added manually in Route 53 console
- GoDaddy nameservers replaced with 4 Route 53 nameservers — DNS fully migrated
- Terraform manages `staging.52patta.in → EIP` automatically on every `apply`/`destroy`
- Decision rationale: see `SOLUTION_DECISIONS.md` → "DNS Provider: Route 53 over GoDaddy"

---

## ✅ Task 3 — Terraform Environment Isolation
**Branch:** `chore/terraform-env-isolation-staging-setup`

- Restructured into `terraform/environments/prod/` and `terraform/environments/staging/`
- Each environment has its own state — `terraform destroy` in staging cannot touch prod
- `prod.tfvars` sets `environment = "production"` → EC2 tag `52-patta-production` (matches `deploy-prod.yml`)
- `staging.tfvars` sets `environment = "staging"` → EC2 tag `52-patta-staging` (matches `deploy-staging.yml`)
- **One-time migration required:** run `terraform import` commands in `terraform/MIGRATION.md` to adopt the existing prod server into prod state

---

## ✅ Task 4 — Staging Server Setup
**Branch:** `chore/terraform-env-isolation-staging-setup`

- `nginx/nginx.staging.conf` — serves `staging.52patta.in` with SSL, same proxy rules as prod
- `docker-compose.prod.yml` — nginx config selected by `NGINX_CONF` env var:
  - prod:    `NGINX_CONF=nginx.conf`
  - staging: `NGINX_CONF=nginx.staging.conf`
- Both deploy workflows now sync `JWT_SECRET`, `MONGO_HOST`, `CORS_ORIGINS`, `NODE_ENV` to the server
- MongoDB: same Atlas cluster, separate databases (`52patta` vs `52patta-staging`) — see `SOLUTION_DECISIONS.md`
- **Manual one-time steps after first `terraform apply -var-file=staging.tfvars`:**
  1. SSH into staging EC2
  2. Clone repo: `git clone https://github.com/LearnersGroup/52-Patta.git /app`
  3. Get SSL cert: `sudo certbot certonly --standalone -d staging.52patta.in`
  4. Trigger `deploy-staging` from GitHub Actions — it handles the rest automatically

---

## ✅ Task 5 — Production Deploy Workflow
**Branch:** `chore/terraform-env-isolation-staging-setup`

The workflow (`deploy-prod.yml`) already existed but was broken — it looked for tag
`52-patta-production` but the server was tagged `52-patta-staging`. Fixed by:
- Task 3 terraform import renames the tag to `52-patta-production`
- Missing env vars (`JWT_SECRET`, `MONGO_HOST`) now synced on every deploy

**Trigger:** push a version tag → `git tag v1.0.9 && git push origin v1.0.9`

---

## GitHub Actions Environment Secrets — what to set

Before any deploy workflow runs, set these in **GitHub → Settings → Environments**:

### `staging` environment
| Type | Key | Value |
|------|-----|-------|
| Secret | `JWT_SECRET` | any strong random string (different from prod) |
| Secret | `MONGO_HOST` | `mongodb+srv://...@cluster.mongodb.net/52patta-staging` |
| Secret | `AWS_ACCESS_KEY_ID` | AWS IAM key with EC2 + ECR access |
| Secret | `AWS_SECRET_ACCESS_KEY` | matching secret |
| Secret | `EC2_SSH_KEY` | private key for `52-patta-staging` key pair |
| Secret | `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| Secret | `FACEBOOK_APP_SECRET` | Facebook OAuth secret |
| Variable | `ECR_REGISTRY` | `198303630852.dkr.ecr.ca-central-1.amazonaws.com` |
| Variable | `STAGING_HOST` | `staging.52patta.in` |
| Variable | `CLIENT_URL` | `https://staging.52patta.in` |
| Variable | `CORS_ORIGINS` | `https://staging.52patta.in` |
| Variable | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| Variable | `GOOGLE_CALLBACK_URL` | `https://staging.52patta.in/api/oauth/google/callback` |
| Variable | `FACEBOOK_APP_ID` | Facebook app ID |
| Variable | `FACEBOOK_CALLBACK_URL` | `https://staging.52patta.in/api/oauth/facebook/callback` |

### `production` environment
| Type | Key | Value |
|------|-----|-------|
| Secret | `JWT_SECRET` | strong random string (different from staging) |
| Secret | `MONGO_HOST` | `mongodb+srv://...@cluster.mongodb.net/52patta` |
| Secret | `AWS_ACCESS_KEY_ID` | same or separate IAM key |
| Secret | `AWS_SECRET_ACCESS_KEY` | matching secret |
| Secret | `EC2_SSH_KEY` | private key for `52-patta-prod` key pair |
| Secret | `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| Secret | `FACEBOOK_APP_SECRET` | Facebook OAuth secret |
| Variable | `ECR_REGISTRY` | `198303630852.dkr.ecr.ca-central-1.amazonaws.com` |
| Variable | `PROD_HOST` | `52patta.in` |
| Variable | `CLIENT_URL` | `https://52patta.in` |
| Variable | `CORS_ORIGINS` | `https://52patta.in,https://www.52patta.in` |
| Variable | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| Variable | `GOOGLE_CALLBACK_URL` | `https://52patta.in/api/oauth/google/callback` |
| Variable | `FACEBOOK_APP_ID` | Facebook app ID |
| Variable | `FACEBOOK_CALLBACK_URL` | `https://52patta.in/api/oauth/facebook/callback` |

---

## The Full Feature Development Loop (once all tasks done)

```
1. Build feature on a branch → merge to main
   → deploy-staging.yml triggers automatically
   → app is live on staging.52patta.in

2. Trigger ship-ios (preview) from GitHub Actions
   → EAS builds against staging.52patta.in
   → lands in TestFlight "Internal Testers"
   → test on your iPhone

3. All good? Push a version tag:
   git tag v1.1.0 && git push origin v1.1.0
   → deploy-prod.yml triggers automatically
   → app is live on 52patta.in
   → trigger ship-ios (production) → TestFlight

4. After testing cycle is done:
   cd terraform/environments/staging
   terraform destroy -var-file=staging.tfvars
   → staging EC2 + EIP + DNS record removed
   → $0 idle cost until next cycle
```
