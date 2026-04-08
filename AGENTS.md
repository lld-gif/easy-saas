## Deployment Workflow

- `develop` branch = Vercel preview deployment. All work happens here first.
- `main` branch = Vercel production deployment (https://vibecodeideas.ai / https://easy-saas-pi.vercel.app).
- **Never push or merge to `main` without asking the user first.** Always confirm before triggering a production deploy.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
