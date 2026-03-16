# Nest Home: Google Cloud Platform (GCP) Deployment Guide

This document provides detailed instructions for deploying the Nest Home application to Google Cloud Platform using Terraform for infrastructure and Cloud Build for automated "one-click" deployments.

## Table of Contents
1.  [Overview](#1-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Terraform Infrastructure Setup](#3-terraform-infrastructure-setup)
    *   [A. Terraform Files](#a-terraform-files)
    *   [B. Configure `variables.tf`](#b-configure-variablestf)
    *   [C. Run Terraform](#c-run-terraform)
4.  [Application Containerization (Dockerfile)](#4-application-containerization-dockerfile)
5.  [Cloud Build for CI/CD](#5-cloud-build-for-cicd)
    *   [A. Artifact Registry Setup](#a-artifact-registry-setup)
    *   [B. Cloud Build Configuration File (`cloudbuild.yaml`)](#b-cloud-build-configuration-file-cloudbuildyaml)
    *   [C. Create Cloud Build Trigger](#c-create-cloud-build-trigger)
    *   [D. Grant Cloud Build Service Account Permissions (IAM)](#d-grant-cloud-build-service-account-permissions-iam)
6.  [Secrets Management (Production Best Practice)](#6-secrets-management-production-best-practice)
7.  [Deployment Flow](#7-deployment-flow)
8.  [Post-Deployment](#8-post-deployment)
9.  [Security Considerations & Production Hardening](#9-security-considerations--production-hardening)

---

## 1. Overview

This guide details a low-cost, serverless deployment strategy for the Nest Home Next.js application (running on port 3100) and its PostgreSQL database on Google Cloud Platform. It leverages:
*   **Terraform:** For declarative infrastructure provisioning (Cloud SQL, Cloud Run Service, VPC Connector).
*   **Docker:** To containerize the Next.js application.
*   **Google Cloud Build:** For automated Continuous Integration/Continuous Deployment (CI/CD) from GitHub.
*   **Cloud Run:** As a fully managed, serverless platform for the application, enabling scale-to-zero.
*   **Cloud SQL:** For a managed PostgreSQL database instance with private IP connectivity.
*   **Serverless VPC Access:** For secure internal communication between Cloud Run and Cloud SQL.

The goal is a "one-click" deployment experience where pushing code to GitHub automatically updates the deployed application.

## 2. Prerequisites

Before you begin, ensure you have:

*   **Google Cloud Platform Project:** An active GCP project with billing enabled.
*   **`gcloud` CLI:** Installed and authenticated on your local machine.
    ```bash
    gcloud auth login
    gcloud auth application-default login
    ```
*   **Terraform CLI:** Installed locally.
*   **GitHub Repository:** Your `nest-home` application code (including `Dockerfile` and `cloudbuild.yaml`) pushed to a GitHub repository (e.g., `https://github.com/tangelis/nest-home`). This guide assumes the `v1.5` branch.
*   **Required GCP APIs Enabled:** Ensure the following APIs are enabled in your GCP project. The Terraform script will attempt to enable them, but pre-enabling can avoid issues:
    *   `Cloud Run API` (`run.googleapis.com`)
    *   `Cloud Build API` (`cloudbuild.googleapis.com`)
    *   `Artifact Registry API` (`artifactregistry.googleapis.com`)
    *   `Cloud SQL Admin API` (`sqladmin.googleapis.com`)
    *   `Compute Engine API` (`compute.googleapis.com`)
    *   `Serverless VPC Access API` (`vpcaccess.googleapis.com`)

## 3. Terraform Infrastructure Setup

This step provisions the core GCP infrastructure components.

### A. Terraform Files

You should have the following Terraform files (provided by LappyClawBot) in a dedicated directory (e.g., `nest-home-gcp-infra`):

*   `main.tf`: Defines the GCP resources (Cloud SQL, VPC Connector, Cloud Run service, API enablers).
*   `variables.tf`: Declares input variables for configuration.
*   `versions.tf`: Specifies Terraform and provider versions.

### B. Configure `variables.tf`

Open `variables.tf` and update the following:

*   `gcp_project_id`: Your Google Cloud Project ID (e.g., `my-nest-home-project-12345`).
*   `gcp_region`: The GCP region for your deployment (e.g., `us-central1`).
*   `cloud_run_service_name`: The name for your Cloud Run service (default: `nest-home-poc`).
*   `docker_image_url`: The full URL for your Docker image in Artifact Registry. This will be in the format: `REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/SERVICE_NAME:TAG`
    *   Example: `us-central1-docker.pkg.dev/my-nest-home-project-12345/nest-home-repo/nest-home-poc:latest`
*   `db_name`: Your PostgreSQL database name (default: `nesthome`).
*   `db_user`: Your PostgreSQL database username (default: `nestuser`).
*   `db_password`: **REQUIRED.** A strong, secure password for your PostgreSQL database user. **Do NOT hardcode sensitive passwords directly in your code for production. Use Secret Manager.**

### C. Run Terraform

Navigate to your `nest-home-gcp-infra` directory in your terminal and execute:

```bash
cd nest-home-gcp-infra
terraform init                       # Initialize Terraform backend and plugins
terraform plan                       # Review the planned changes
terraform apply                      # Apply the changes to create resources
# You can use 'terraform apply --auto-approve' for non-interactive execution,
# but it's recommended to review the plan first.
```

This step will:
*   Create a Cloud SQL PostgreSQL instance.
*   Create the `nesthome` database and user.
*   Provision a Serverless VPC Access Connector.
*   Enable necessary GCP APIs.
*   Define the Cloud Run service, initially without a deployed image (it will be deployed by Cloud Build).

## 4. Application Containerization (Dockerfile)

A `Dockerfile` has been generated for your Nest Home application, located at `nest-home/Dockerfile` within your repository. This Dockerfile:

*   Uses `node:20-alpine` as its base image.
*   Installs `pnpm`.
*   Builds your Next.js application.
*   Exposes port `3100`.
*   Sets the `NODE_ENV` to `production`.
*   Adds a dedicated `nextjs` user for running the application inside the container, adhering to the principle of least privilege.
*   Sets `CMD ["pnpm", "start"]` to run the application.

## 5. Cloud Build for CI/CD

Google Cloud Build will automate the process of building your Docker image, pushing it to Artifact Registry, and deploying it to Cloud Run upon every code push to your GitHub repository.

### A. Artifact Registry Setup

You need a Docker repository in Google Artifact Registry to store your application's Docker images.

1.  Go to the **Artifact Registry** section in the GCP Console.
2.  Click **"Create Repository"**.
3.  **Name:** `nest-home-repo` (ensure this matches `_AR_REPO_NAME` substitution in `cloudbuild.yaml`).
4.  **Format:** Select `Docker`.
5.  **Region:** Select your chosen GCP region (e.g., `us-central1`).
6.  Click **"Create"**.

### B. Cloud Build Configuration File (`cloudbuild.yaml`)

The `cloudbuild.yaml` file, located at `nest-home/cloudbuild.yaml` in your repository, defines the steps for Cloud Build:

*   **`GetDBHost` Step:** Dynamically fetches the private IP address of your Cloud SQL instance using `gcloud sql instances describe`. This ensures the `DATABASE_URL` environment variable points to the correct internal IP.
*   **`Build` Step:** Builds the Docker image for your Nest Home application using the `Dockerfile`.
*   **`Push` Step:** Pushes the built Docker image to your Artifact Registry repository.
*   **`Deploy` Step:** Deploys the new Docker image to your Cloud Run service.
    *   It includes `--allow-unauthenticated` for PoC purposes. **Remove this for production!**
    *   It sets the `DATABASE_URL` and `PORT` environment variables for your application.
    *   It configures `--vpc-connector` for private access to Cloud SQL.
    *   Sets `--min-instances=0` for cost-saving (scales to zero when idle).

### C. Create Cloud Build Trigger

This is the "one-click" part. A Cloud Build trigger will automatically start the build and deployment process whenever you push code to your GitHub repository.

1.  Go to **Cloud Build** > **Triggers** in the GCP Console.
2.  Click **"Connect Repository"** and follow the prompts to connect your GitHub account and select your `tangelis/nest-home` repository.
3.  Once connected, click **"Create Trigger"**.
4.  **Name:** `nest-home-ci-cd` (or a descriptive name).
5.  **Region:** Select your GCP region.
6.  **Event:** Choose `Push to a branch`.
7.  **Source:**
    *   **Repository:** Select your `tangelis/nest-home` GitHub repository.
    *   **Branch:** Specify `^v1.5$` (or the branch you are using for deployment).
8.  **Configuration:**
    *   **Type:** `Cloud Build configuration file`.
    *   **Location:** `Repository`.
    *   **Cloud Build file location:** `/cloudbuild.yaml`.
9.  **Substitutions:**
    *   Click **"Add substitution variable"**.
    *   **Variable:** `_DB_PASSWORD`
    *   **Value:** **Enter your actual PostgreSQL database password here.**
        *   **SECURITY NOTE:** For a PoC, this is functional. For production, **DO NOT** use this method. Store your secrets in Google Secret Manager and configure Cloud Build to access them securely.
10. Click **"Create"**.

### D. Grant Cloud Build Service Account Permissions (IAM)

The Cloud Build service account needs specific permissions to perform its tasks.

1.  Go to **IAM & Admin** > **IAM** in your GCP Console.
2.  Locate the **Cloud Build service account**. Its email will typically be in the format: `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`.
3.  Click the pencil icon to edit its permissions.
4.  Add the following roles:
    *   `Cloud Run Admin`
    *   `Artifact Registry Writer`
    *   `Cloud SQL Client`
    *   `Service Account User`
    *   `Compute Network User`
    *   `Secret Manager Secret Accessor` (if you implement Secret Manager later)
5.  Click **"Save"**.

## 6. Secrets Management (Production Best Practice)

**For a PoC, providing `_DB_PASSWORD` via Cloud Build substitution is acceptable for quick setup. However, for any production workload, this is a significant security vulnerability.**

**Recommendation:**
Migrate your `db_password` to **Google Secret Manager**.

1.  **Create a Secret:** In Secret Manager, create a secret (e.g., `nest-home-db-password`) and store your database password as its value.
2.  **Update Cloud Build:** Modify your `cloudbuild.yaml` to retrieve the password from Secret Manager at runtime. Example:
    ```yaml
    # ... (inside a Cloud Build step, replace direct substitution)
    - name: 'gcr.io/cloud-builders/gcloud'
      args:
        - 'secrets'
        - 'versions'
        - 'access'
        - 'latest'
        - '--secret=nest-home-db-password'
        - '--project=${PROJECT_ID}'
      id: 'get-db-password'
      entrypoint: 'bash'
      args: ['-c', 'gcloud secrets versions access latest --secret=nest-home-db-password --project=${PROJECT_ID} > /workspace/db_password.txt']
    # Then reference it in the deploy step
    # ...
    - name: 'gcr.io/cloud-builders/gcloud'
      # ...
      args:
        # ...
        - '--set-env-vars=DATABASE_URL=postgresql://${_DB_USER}:$(cat /workspace/db_password.txt)@$(cat /workspace/env_vars.txt | grep _DB_HOST | cut -d'=' -f2)/${_DB_NAME}'
    ```
3.  **Grant Secret Manager Access:** Ensure the Cloud Build service account has the `Secret Manager Secret Accessor` role.

## 7. Deployment Flow

Once the Terraform infrastructure is up and the Cloud Build trigger is configured:

1.  Develop your Nest Home application locally.
2.  Commit your changes to the `v1.5` branch of your `tangelis/nest-home` GitHub repository.
3.  **Push your changes to GitHub.**
4.  Cloud Build will automatically detect the push and initiate the build-deploy pipeline.
5.  Monitor the build progress in the **Cloud Build History** section of the GCP Console.

## 8. Post-Deployment

After a successful deployment:

*   **Access the Application:** You can find the URL of your deployed Cloud Run service in the Cloud Run section of the GCP Console or in the Terraform output (`cloud_run_url`).
*   **Monitor:** Use **Cloud Logging** and **Cloud Monitoring** to observe your application's health, logs, and performance.
*   **Database Access:** To connect to your Cloud SQL instance from your local machine (for development/debugging), you'll typically use the Cloud SQL Proxy. Refer to Google Cloud documentation for details.

## 9. Security Considerations & Production Hardening

While this PoC setup is functional, keep the following security recommendations in mind for a production environment:

*   **Authentication & Authorization (Critical):** Remove `allUsers` access to Cloud Run. Implement user authentication (e.g., IAP, application-level authentication like NextAuth.js).
*   **Secrets Management (Critical):** Always use Google Secret Manager for sensitive data like database passwords.
*   **Least Privilege:** Continuously review and prune IAM permissions for all service accounts (Cloud Build, Cloud Run runtime service account) to ensure they only have the absolute minimum required.
*   **Cloud SQL Deletion Protection:** Set `deletion_protection_enabled = true` in `main.tf` for Cloud SQL instances.
*   **Cloud SQL User Host Restriction:** Restrict the PostgreSQL user `host` to the specific Cloud Run service account instead of `"%"` for tighter database access control.
*   **Web Application Firewall (WAF):** For public-facing applications, implement Cloud Armor to protect against common web attacks and DDoS.
*   **Database Migrations:** Establish a robust strategy for applying database schema migrations as part of your CI/CD pipeline.
*   **Application-level Security:** Don't forget to implement security best practices within your Next.js application (input validation, output encoding, dependency scanning, secure session management, etc.).
*   **Private Image Pull:** For production, ensure your Cloud Run service pulls images from Artifact Registry using a service account with minimal permissions.
*   **Audit Logging:** Enable audit logging for critical GCP services to track access and changes.

By addressing these points, you can evolve your Nest Home deployment from a functional PoC to a secure and robust production system.
