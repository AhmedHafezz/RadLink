# RadLink — Render.com Deployment Guide

## One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ahmedhafezz/radlink)

---

## Manual Deployment Steps

### 1. Fork / Push to GitHub
Make sure your code is on GitHub at `ahmedhafezz/radlink`.

### 2. Create Services on Render

Go to **render.com → New → Blueprint** and connect your GitHub repo.
Render will read `render.yaml` and create all services automatically.

Or create manually:

#### PostgreSQL Database
- Dashboard → New → PostgreSQL
- Name: `radlink-db`
- Plan: Free
- Region: Frankfurt (EU)
- Copy the **Internal Database URL**

#### Backend Web Service
- Dashboard → New → Web Service
- Connect repo → Root Directory: `/` (repo root)
- Name: `radlink-backend`
- Runtime: **Docker**
- Dockerfile Path: `./backend/RadLink.API/Dockerfile`
- Docker Build Context: `./backend`
- Plan: Free

**Environment Variables (set in dashboard):**

| Key | Value |
|-----|-------|
| `ConnectionStrings__DefaultConnection` | *(from Render PostgreSQL → Internal URL)* |
| `Redis__ConnectionString` | *(from Upstash — see below)* |
| `Jwt__SecretKey` | *(random 256-bit string)* |
| `Jwt__Issuer` | `radlink-api` |
| `Jwt__Audience` | `radlink-app` |
| `AWS__BucketName` | `radlink-dicom` |
| `AWS__Region` | `eu-central-1` |
| `AWS__AccessKey` | *(your AWS / Cloudflare R2 key)* |
| `AWS__SecretKey` | *(your AWS / Cloudflare R2 secret)* |
| `AWS__ServiceUrl` | `https://s3.eu-central-1.amazonaws.com` |
| `AllowedOrigins__0` | `https://radlink-frontend.onrender.com` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

#### Frontend Web Service
- Dashboard → New → Web Service
- Connect repo → Root Directory: `/`
- Name: `radlink-frontend`
- Runtime: **Docker**
- Dockerfile Path: `./frontend/Dockerfile`
- Docker Build Context: `./frontend`
- Plan: Free

**Build-time ARGs (Docker Build Args):**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://radlink-backend.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://radlink-frontend.onrender.com` |

> **Important:** After the backend deploys, copy its actual URL and set it as `NEXT_PUBLIC_API_URL`, then trigger a new build of the frontend.

---

### 3. Free Redis — Upstash

Render's free tier doesn't include Redis. Use **Upstash** (free):

1. Go to [upstash.com](https://upstash.com) → Create Database
2. Region: EU (Frankfurt)
3. Copy the **Redis URL**: `redis://default:<pass>@<host>:<port>`
4. Set as `Redis__ConnectionString` in the backend environment variables

---

### 4. Free Object Storage — Cloudflare R2

AWS S3 charges for egress. Use **Cloudflare R2** (free 10GB):

1. Cloudflare Dashboard → R2 → Create Bucket: `radlink-dicom`
2. R2 → Manage API Keys → Create token (Admin Read & Write)
3. Set `AWS__ServiceUrl` to your R2 endpoint:
   `https://<account-id>.r2.cloudflarestorage.com`
4. Set `AWS__Region` to `auto`
5. Set `AWS__AccessKey` and `AWS__SecretKey` from R2 API token

---

### 5. Database Migrations

After backend deploys, run EF migrations via Render Shell:

```bash
# In Render Dashboard → radlink-backend → Shell
cd /app
dotnet ef database update --project RadLink.Infrastructure --startup-project RadLink.API
```

Or add a migration script in the Dockerfile (recommended for production).

---

## Service URLs

After deployment:
- **Frontend**: `https://radlink-frontend.onrender.com`
- **Backend API**: `https://radlink-backend.onrender.com`
- **Swagger UI**: `https://radlink-backend.onrender.com/swagger`
- **Health Check**: `https://radlink-backend.onrender.com/health`

---

## Free Tier Limitations on Render

| Resource | Free Limit |
|----------|-----------|
| Web Services | Spin down after 15min inactivity (cold start ~30s) |
| PostgreSQL | 256MB RAM, 1GB storage, **90 days** then deleted |
| Bandwidth | 100GB/month |
| Build time | 500 min/month |

For production, upgrade to the **Starter** plan ($7/month per service).
