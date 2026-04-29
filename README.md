# Aegis API

### A Distributed API Gateway for Authentication, Rate Limiting, and Observability

---

## Overview

**Aegis API** is a production-inspired API Gateway built with Node.js that acts as a centralized entry point for microservices. It handles authentication, distributed rate limiting, request routing, logging, and monitoring.

This project demonstrates **real-world backend architecture concepts** used in scalable systems, including API Gateway patterns, observability, and distributed control using Redis.

---

## Features

*  **JWT Authentication** (Access + Refresh Tokens)
*  **API Gateway Routing** (Single entry point for services)
*  **Distributed Rate Limiting** using Redis (Sliding Window)
*  **PostgreSQL Integration** with Prisma ORM (Dockerized)
*  **Monitoring & Metrics** (Prometheus-compatible `/metrics`)
*  **Structured Logging** (Winston with request tracing)
*  **Path Rewriting & Service Mapping**
*  **Dockerized Infrastructure** (Postgres, Redis, Prometheus)

---

## Progress

* ✅ Phase 1: API Gateway (Routing + Proxy)
* ✅ Phase 2: Authentication (JWT + Middleware)
* ✅ Phase 2.5: PostgreSQL + Prisma (Dockerized DB)
* ✅ Phase 3: Rate Limiting (Redis, Sliding Window)
* ✅ Phase 4: Structured Logging (Winston + Request Tracing)
* ✅ Phase 5: Monitoring (Health Checks + Prometheus Metrics)

---

## Architecture

Client → API Gateway → Rate Limiter → Auth → Service Routing → Response

* Gateway validates JWT tokens
* Applies distributed rate limiting per IP
* Routes request to appropriate microservice
* Logs requests and exposes metrics for monitoring

---

## Tech Stack

* **Backend:** Node.js (Express)
* **Database:** PostgreSQL (Docker) + Prisma ORM
* **Cache & Rate Limiting:** Redis
* **Authentication:** JWT + bcrypt
* **Monitoring:** Prometheus (metrics scraping)
* **Logging:** Winston (structured logs)
* **Containerization:** Docker

---

## Project Structure

```
aegis-api/
│
├── api-gateway/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── utils/
│   │   └── app.js
│
├── auth-service/
├── user-service/
├── order-service/
│
├── docker-compose.yml
├── prometheus.yml
└── README.md
```

---

## Getting Started

### 1️ Clone the repository

```bash
git clone https://github.com/your-username/aegis-api.git
cd aegis-api
```

---

### 2️ Start Infrastructure (Docker)

```bash
docker-compose up -d
```

---

### 3️ Install dependencies

```bash
cd api-gateway
npm install
```

---

### 4️ Setup environment variables

Create `.env`:

```
PORT=5000
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_auth
REDIS_URL=redis://localhost:6379
```

---

### 5️⃣ Run Services

```bash
# API Gateway
node src/app.js

# Auth Service
node app.js

# Other services similarly
```

---

## 📡 API Endpoints

| Endpoint         | Description             |
| ---------------- | ----------------------- |
| `/api/users`     | Routes to User Service  |
| `/api/orders`    | Routes to Order Service |
| `/auth/login`    | User login              |
| `/auth/register` | User signup             |
| `/health`        | Health check endpoint   |
| `/metrics`       | Prometheus metrics      |

---

## Example Flow

1. Client sends request → `/api/users`
2. Gateway applies rate limiting (Redis)
3. JWT authentication is validated
4. Request is routed to User Service
5. Response is returned via Gateway
6. Metrics & logs are recorded

---

## Key Design Decisions

* **Redis for rate limiting** → Fast, distributed control
* **Sliding window algorithm** → Prevent burst abuse
* **JWT authentication** → Stateless and scalable
* **API Gateway pattern** → Centralized request handling
* **Prometheus metrics** → Observability and monitoring

---

## Challenges Solved

* Handling request bursts using sliding window rate limiting
* Avoiding double body parsing in proxy (fixed gateway issue)
* Ensuring monitoring endpoints are not rate-limited
* Designing scalable authentication with persistent storage

---

## Future Improvements

* Grafana dashboards for visualization
* User-based rate limiting (RBAC / tiers)
* Distributed tracing (Jaeger)
* Kubernetes deployment
* Circuit breaker implementation

---

## Resume Impact

> Built a distributed API Gateway with JWT authentication, Redis-based sliding window rate limiting, PostgreSQL persistence, and Prometheus monitoring, demonstrating real-world microservices architecture and observability.

---

## License

MIT License

---

## Final Note

This project focuses on **backend engineering depth, system design, and real-world scalability challenges** rather than basic CRUD operations.
