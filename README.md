# RadLink - Cloud PACS & Web Viewer Platform

**منصة الأشعة الطبية السحابية** | Cloud Medical Imaging SaaS Platform

## Overview / نظرة عامة

RadLink is a multi-tenant SaaS platform for medical imaging (DICOM) storage, viewing, and radiology reporting.

RadLink هي منصة SaaS متعددة المستأجرين لتخزين الصور الطبية (DICOM) وعرضها وإعداد تقارير الأشعة.

## Architecture

- **Frontend:** Next.js 14 + Cornerstone3D (WebGL DICOM viewer)
- **Backend:** .NET Core 8 Web API + fo-dicom
- **Database:** PostgreSQL (multi-tenant with TenantID isolation)
- **Cache:** Redis (DICOM metadata caching)
- **Storage:** AWS S3 / MinIO (AES-256 encrypted)

## Quick Start (Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- .NET SDK 8.0

### Run with Docker

```bash
cp .env.example .env
docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| MinIO Console | http://localhost:9001 |
| Nginx (reverse proxy) | http://localhost:80 |

### Run Services Individually

**Backend:**
```bash
cd backend/RadLink.API
dotnet restore
dotnet run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Subscription Tiers

| Tier | Target | Storage |
|------|--------|---------|
| Basic | Private clinics | 50 active studies/month |
| Professional | Radiology centers | Unlimited + 2 year retention |
| Enterprise | Hospitals | DICOMweb WADO-RS integration |

## HIPAA & GDPR Compliance

- AES-256 server-side encryption for all DICOM files at rest
- DICOM anonymization option before sharing studies
- No PHI stored in browser localStorage or cookies
- Audit logging for all PHI access events
- Automatic data retention policies per tenant configuration
- TLS 1.3 in transit encryption

## Project Structure

```
RadLink/
├── backend/
│   ├── RadLink.API/          # ASP.NET Core Web API
│   ├── RadLink.Application/  # Application layer (CQRS)
│   ├── RadLink.Domain/       # Domain entities & interfaces
│   └── RadLink.Infrastructure/ # EF Core, S3, Redis
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # React components
│   │   └── lib/              # Cornerstone3D setup
│   └── Dockerfile
├── docker/
│   └── nginx.conf            # Reverse proxy config
├── docker-compose.yml
├── .env.example
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request
