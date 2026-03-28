# SlopMuter Users Service

User management microservice for **[SlopMuter](https://slopmuter.com)**, a browser extension that filters AI-generated slop and low-effort content from X/Twitter feeds.

## Overview

A user profile and preferences API built with Express and TypeScript, providing authenticated user management, category-based content filtering preferences, and usage statistics. Designed for easy deployment from EC2 to ECS/Fargate.

## Features

- JWT-authenticated user profile management (get, update, delete)
- User data export (GDPR-friendly)
- Category-based content filtering preferences with bitmask storage
- Tier-aware preference limits (Free: 3 categories, Pro: unlimited)
- Pro-only usage statistics endpoint
- PostgreSQL-backed user and preference storage
- Redis-backed request rate limiting
  - Global limiter: max 200 requests per minute
- Dockerized for consistent deployment
- Zod-powered request validation

## Installation

```bash
yarn install
```

## Prerequisites

**You must have [slopmuter-infra](https://github.com/diragb/slopmuter-infra) running before starting this service.** The shared infrastructure (PostgreSQL + Redis) must be started first. Clone the infra repo and run `yarn containers:start` there.

## Getting Started

### Local Development

**Note:** If you don't have Docker installed, download and install it from [https://www.docker.com/get-started](https://www.docker.com/get-started) and ensure Docker is running before continuing.

1. **Start shared infrastructure.** Clone and start [slopmuter-infra](https://github.com/diragb/slopmuter-infra):

   ```bash
   # In slopmuter-infra directory
   yarn containers:start
   ```

2. **Run database migrations.** Migrations are managed by slopmuter-infra. Run them from that repo:
   ```bash
   yarn db:migrate
   ```

3. **Create a `.env` file** with required environment variables (see `.env.example`):

   ```env
   SERVICE_NAME=users-service
   NODE_ENV=production
   PORT=8081

   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=slopmuter
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/slopmuter

   JWT_ACCESS_SECRET=...

   REDIS_URL=redis://localhost:6379

   APP_BASE_URL=https://api.slopmuter.com
   ALLOWED_ORIGINS=chrome-extension://mcihoalbpibkcngfpohfolldkicapgcj,https://slopmuter.com,http://localhost:3000
   ```

4. **Start the development server:**

   ```bash
   yarn dev
   ```

   The service will be available at `http://localhost:8081`.

### Running with Docker Compose

The `compose.yml` in this repo spins up **only the API service**. It assumes slopmuter-infra is already running. Ensure PostgreSQL and Redis are available at `localhost:5433` and `localhost:6379` before running:

```bash
yarn docker:start
```

## API Endpoints

All `/v1/users` routes require a valid JWT access token in the `Authorization: Bearer <token>` header.

- `GET /v1/health` - Health check
- `GET /v1/users/me` - Get full user profile with preferences
- `PATCH /v1/users/me` - Update user profile
- `DELETE /v1/users/me` - Delete user account
- `GET /v1/users/me/export` - Export all user data
- `GET /v1/users/me/preferences` - Get content filtering preferences
- `PUT /v1/users/me/preferences` - Update content filtering preferences
- `GET /v1/users/me/stats` - Get usage statistics (Pro only)

## Deployment

The service is containerized and can be deployed to EC2, ECS, or any Docker-compatible environment. See the included `Dockerfile` and `compose.yml` for deployment configuration.

## Tech Stack

- Express + TypeScript
- PostgreSQL (AWS RDS)
- Redis (rate limiting store)
- JWT for access token verification
- Docker
- express-rate-limit + rate-limit-redis
- Zod for validation
- Pino for structured logging
- Vitest + Testcontainers for testing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature or fix branch (`git checkout -b feat/amazing-feature` or `git checkout -b fix/required-fix`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'` or `git commit -m 'fix: add required fix'`)
4. Push to the branch (`git push origin feat/amazing-feature` or `git push origin fix/required-fix`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Issues](https://github.com/diragb/slopmuter-users-ms/issues)
- [Repository](https://github.com/diragb/slopmuter-users-ms)
- [Author](https://github.com/diragb)

---

Made with ❤️ by [Dirag Biswas](https://github.com/diragb)
