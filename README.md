# Aegis API

### A Distributed API Gateway for Authentication, Rate Limiting, and Observability

---

## Overview

**Aegis API** is a production-inspired API Gateway built with Node.js that acts as a centralized entry point for microservices. It handles authentication, distributed rate limiting, intelligent request routing, logging, and monitoring.

This project demonstrates **real-world backend architecture concepts** such as API Gateway patterns, distributed systems, observability, and containerized microservices.

---

## Features

* **JWT Authentication** (Access + Refresh Tokens)
* **API Gateway Routing** (Single entry point for services)
* **Distributed Rate Limiting** using Redis (Sliding Window)
* **PostgreSQL Integration** with Prisma ORM
* **Monitoring & Metrics** (Prometheus + `/metrics`)
* **Grafana Dashboards** (Traffic, latency, error rate)
* **Structured Logging** (Winston with request tracing)
* **Path Rewriting & Service Mapping**
* **Fully Dockerized Microservices Architecture**

---

## Progress

* ✅ Phase 1: API Gateway (Routing + Proxy)
* ✅ Phase 2: Authentication (JWT + Middleware)
* ✅ Phase 2.5: PostgreSQL + Prisma (Dockerized DB)
* ✅ Phase 3: Rate Limiting (Redis, Sliding Window)
* ✅ Phase 4: Structured Logging (Winston + Request Tracing)
* ✅ Phase 5: Monitoring (Health Checks + Prometheus Metrics)
* ✅ Phase 6: Full Dockerized Microservices Setup

---

## Architecture

Client → API Gateway → Rate Limiter (Redis) → Authentication (JWT) → Service Routing → Response

### Flow:

* API Gateway acts as a centralized entry point
* Redis enforces distributed rate limiting
* Auth service validates JWT tokens
* Requests are routed to independent microservices
* Logs and metrics are captured for observability

---

## Tech Stack

* **Backend:** Node.js (Express)
* **Database:** PostgreSQL + Prisma ORM
* **Cache & Rate Limiting:** Redis
* **Authentication:** JWT + bcrypt
* **Monitoring:** Prometheus
* **Visualization:** Grafana
* **Logging:** Winston
* **Containerization:** Docker + Docker Compose

---

## Docker Setup

The entire system is containerized using Docker Compose.

### Services Included:

* API Gateway
* Auth Service
* User Service
* Order Service
* PostgreSQL
* Redis
* Prometheus
* Grafana

### Run Everything:

```bash
docker-compose up --build
```

---

## Access Services

| Service     | URL                   |
| ----------- | --------------------- |
| API Gateway | http://localhost:5000 |
| Grafana     | http://localhost:3000 |
| Prometheus  | http://localhost:9090 |

---

## 📊 Observability

The system includes a full monitoring stack:

* Prometheus for metrics collection
* Grafana dashboards for visualization

### Metrics Tracked:

* Total request count
* Requests by route
* Requests by status code

This provides **real-time insight into system performance**.

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

## API Endpoints

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
6. Logs and metrics are recorded

---

## Key Design Decisions

* **API Gateway pattern** → Centralized request handling
* **JWT authentication** → Stateless and scalable
* **Redis sliding window** → Accurate rate limiting under burst traffic
* **Docker Compose** → Reproducible multi-service environment
* **Prometheus + Grafana** → Observability and performance monitoring

---

## Challenges Solved

* Fixed request body loss in proxy (Express middleware issue)
* Handled Docker networking (`localhost` vs service names)
* Prevented Prometheus from being rate-limited
* Resolved Prisma + Docker migration issues
* Managed environment separation (local vs Docker)

---

## Future Improvements

* Grafana alerts & advanced dashboards
* Role-based rate limiting (RBAC / API tiers)
* Distributed tracing (Jaeger)
* Kubernetes deployment
* Circuit breaker implementation

---

## Resume Impact

> Built a distributed API Gateway with JWT authentication, Redis-based sliding window rate limiting, PostgreSQL persistence using Prisma, and full observability using Prometheus and Grafana, all containerized with Docker Compose.

---

## License

MIT License

---

## Final Note

This project focuses on **backend engineering depth, system design, and real-world scalability challenges** rather than basic CRUD operations.
