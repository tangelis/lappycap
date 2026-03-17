# GCP nest-legacy Project — Security Assessment for Premium Model Review

**Purpose:** Have a premium model confirm the security posture of the **nest-legacy** GCP project.  
**Project ID:** `nest-legacy`  
**Scope:** Cloud Run app, Cloud SQL, Secret Manager, IAM, and network exposure.

---

## 1. Architecture Summary

- **Cloud Run:** One service, `nest-legacy`, in `us-central1`. Next.js app (NextAuth credentials, Drizzle, PostgreSQL).
- **Cloud SQL:** One instance, `nest-legacy-db` (PostgreSQL 15), same region. Database `nesthome`, user `lamppost`.
- **Secrets:** `DATABASE_URL` and `AUTH_SECRET` in Secret Manager; Cloud Run reads them at runtime.
- **No VMs, App Engine, or Cloud Functions.** No VPC connector on Cloud Run; DB access is via Cloud SQL connection (Unix socket).

---

## 2. Cloud Run (nest-legacy) — Invocation / Who Can Hit the App

**IAM on the service (invoker):**

- `roles/run.invoker` granted to:
  - `domain:nesthomemanagement.com`
  - `group:updates@nesthomemanagement.com`
- **No** `allUsers` or `allAuthenticatedUsers` — public unauthenticated access is **disabled**.

**Implications:**

- Only principals in the above domain/group can successfully invoke the service.
- Invocation requires a **Bearer identity token** (OAuth2 token for the service URL). Browsers do not send this when users “log in with Google,” so direct browser access returns 403 unless access is mediated (e.g. `gcloud run services proxy` or IAP in front).
- **Request:** Confirm that this IAM configuration is sufficient to consider the service “not public” and that the main residual risk is insider/org abuse, not anonymous internet access.

---

## 3. Cloud SQL (nest-legacy-db) — Who Can Connect

- **Authorized networks:** None (`authorizedNetworks` is empty). The instance has a public IP but no allowed CIDRs for direct public IP access.
- **Cloud Run → DB:** The Cloud Run service uses the **Cloud SQL Admin API / built-in connector** (annotation `run.googleapis.com/cloudsql-instances: nest-legacy:us-central1:nest-legacy-db`). The Run service account `nest-legacy-run@nest-legacy.iam.gserviceaccount.com` has `roles/cloudsql.client` at **project** level. Connection is over Google’s internal path (socket), not over the instance’s public IP.
- **Project roles:** Project has Owner (`info@nesthomemanagement.com`) and default Editor (compute SA). Those identities can use Cloud SQL Auth Proxy or other tools to connect if they have DB credentials.

**Request:** Confirm that (a) no authorized networks means no direct public-internet access to the DB, and (b) limiting `cloudsql.client` to the Run SA (and project owners/editors by virtue of project IAM) is a sound pattern.

---

## 4. Secret Manager — Who Can Read App Secrets

- **DATABASE_URL** and **AUTH_SECRET:** Only `nest-legacy-run@nest-legacy.iam.gserviceaccount.com` has `roles/secretmanager.secretAccessor` on these secrets (from secret-level IAM).
- Project Owner can always change IAM or read secrets via console/API.

**Request:** Confirm that restricting secret access to the single Run service account is appropriate and that there are no overly broad project-level roles granting Secret Manager access to unnecessary principals.

---

## 5. Project-Level IAM (Relevant Bindings)

- **Owner:** `user:info@nesthomemanagement.com`
- **Editor:** Default compute and cloudservices SAs (for GCP managed services).
- **Custom:** `nest-legacy-run@nest-legacy.iam.gserviceaccount.com` has `roles/cloudsql.client` (project-level).
- No other user/group principals found at project level for this review.

**Request:** Confirm there are no overly permissive project roles (e.g. broad Editor to human identities beyond Owner).

---

## 6. Application and Build

- **Runtime:** Service runs as `nest-legacy-run@nest-legacy.iam.gserviceaccount.com`; no secrets in env vars (pulled from Secret Manager). `AUTH_URL` / `NEXTAUTH_URL` set to the service URL.
- **Repo:** There is an old `cloudbuild.yaml` in repo that references `--allow-unauthenticated` and a different service name (nest-home-poc). The **deployed** nest-legacy service was deployed with **no** public access (invoker-only as above). **Request:** Confirm that the repo’s cloudbuild.yaml should not be used as-is for nest-legacy and that it’s a documentation/template risk only.

---

## 7. Network and Ingress

- Cloud Run: No explicit `run.googleapis.com/ingress` annotation observed; default is “all” (accept traffic from internet), but **invoker IAM** still enforces who can call the service.
- Cloud SQL: Public IP present, no authorized networks. **Request:** Confirm that “no authorized networks” is sufficient to treat the DB as not exposed to the public internet for direct connections.

---

## 8. Summary Checklist for Reviewer

Please confirm or correct:

1. **Cloud Run** is not publicly callable; only domain/group with identity token can invoke.
2. **Cloud SQL** is not exposed to the public internet (no authorized networks); only Cloud Run (via connector) and project-privileged users can connect.
3. **Secrets** are restricted to the Run service account (and project Owner by default).
4. **Project IAM** has no unexpected broad grants to human users/groups.
5. **Residual risks** (e.g. org insider access, need for IAP/proxy for browser SSO, secret rotation, locking down Cloud SQL to private IP only) are acceptable or called out for improvement.

---

## 9. Optional Hardening (Not Yet Done)

- Cloud SQL: Use only private IP and Private Service Connect / VPC if desired.
- Secrets: Regular rotation for `AUTH_SECRET` and DB password.
- Cloud Run: Consider `ingress=internal-and-cloud-load-balancing` if putting a load balancer + IAP in front.
- Repo: Remove or update `cloudbuild.yaml` so it never deploys with `--allow-unauthenticated` for this project.

---

**End of assessment.** Please reply with: (1) confirmation or corrections to the above, (2) any additional risks, and (3) priority of optional hardening steps.
