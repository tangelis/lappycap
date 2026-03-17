This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Nest-legacy (this repo)

This branch is **nest-legacy**, derived from nest-home v1.5: Next.js, Drizzle, PostgreSQL, NextAuth credentials.

*   **Local development:** See **[deploy/README.md](./deploy/README.md)** for Postgres in Docker, `.env.local`, and running the app.
*   **GCP deployment:** The **nest-legacy** GCP project runs this app on Cloud Run with Cloud SQL (PostgreSQL). Access is restricted to the org/domain via IAM (`roles/run.invoker`). See **[docs/GCP_DEPLOYMENT.md](./docs/GCP_DEPLOYMENT.md)** for the general GCP guide and **[docs/SECURITY_ASSESSMENT_FOR_REVIEW.md](./docs/SECURITY_ASSESSMENT_FOR_REVIEW.md)** for a security review checklist.

## Google Cloud Platform (GCP) Deployment

This project can be deployed to GCP using **Terraform** for infrastructure and **Cloud Build** for CI/CD. The **nest-legacy** production deployment uses Cloud Run + Cloud SQL (no Terraform in this repo); IAM is used to restrict invocation to the organization.

*   **[GCP Deployment Guide](./docs/GCP_DEPLOYMENT.md)** — Terraform, Docker, Cloud Build, Cloud Run, Cloud SQL, security considerations.
*   **[Security assessment checklist](./docs/SECURITY_ASSESSMENT_FOR_REVIEW.md)** — For review by a security-minded reviewer (e.g. premium model or internal audit).
