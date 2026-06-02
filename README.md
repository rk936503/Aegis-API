# 🛡️ Aegis API

A production-grade microservices backend built with Node.js, featuring JWT authentication, distributed rate limiting, circuit breaking, and full observability.

## Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              API Gateway :5000           │
                        │                                         │
                        │  Auth → Rate Limiter → Circuit Breaker  │
                        └───────┬──────────┬──────────┬───────────┘
                                │          │          │
                    ┌───────────▼─┐  ┌─────▼──────┐  ┌▼────────────┐
                    │ Auth Service│  │User Service│  │Order Service│
                    │   :5003     │  │   :5001    │  │   :5002     │
                    └──────┬──────┘  └─────┬──────┘  └──────┬──────┘
                           │               │                 │
                    ┌──────▼───────────────▼─────────────────▼──────┐
                    │              PostgreSQL :5432                   │
                    │   aegis_auth  |  aegis_users  |  aegis_orders  │
                    └────────────────────────────────────────────────┘
                    ┌──────────────────────┐  ┌───────────────────────┐
                    │     Redis :6379      │  │  Prometheus + Grafana │
                    │  Token Blacklist     │  │    :9090  |  :3000    │
                    │  Rate Limit Windows  │  └───────────────────────┘
                    └──────────────────────┘
```

## Services

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 5000 | Auth enforcement, rate limiting, circuit breaking, metrics |
| **Auth Service** | 5003 | JWT issue/refresh/revoke, bcrypt password hashing |
| **User Service** | 5001 | User profile CRUD |
| **Order Service** | 5002 | Order lifecycle management with state machine |
| **PostgreSQL** | 5432 | Persistent storage (3 separate databases) |
| **Redis** | 6379 | Token blacklisting, distributed rate limiting |
| **Prometheus** | 9090 | Metrics scraping |
| **Grafana** | 3000 | Metrics dashboards |

## Key Features

- **JWT Authentication** — access + refresh token pair, stateful logout via Redis blacklist
- **Distributed Rate Limiting** — sliding window algorithm via Redis, role-aware limits (admin/premium/user)
- **Circuit Breaker** — opossum-based per-service circuit breakers with Prometheus state tracking
- **Observability** — request counter, latency histogram, circuit breaker gauge, rate limit counter
- **Order State Machine** — strict `PENDING → CONFIRMED → SHIPPED → DELIVERED` transitions
- **Multi-stage Docker builds** — node:20-alpine, ~200MB images vs ~1.1GB
- **Health checks** — postgres and redis readiness gates for deterministic startup order

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+ (for local dev)

### 1. Clone and configure

```bash
git clone https://github.com/rk936503/aegis-api.git
cd aegis-api
```

Copy the example env files and fill in your secrets:

```bash
cp api-gateway/.env.example   api-gateway/.env
cp auth-service/.env.example  auth-service/.env
cp user-service/.env.example  user-service/.env
cp order-service/.env.example order-service/.env
```

### 2. Start everything

```bash
docker-compose up --build
```

All services start in dependency order — postgres and redis health checks gate the microservices, which gate the API gateway.

### 3. Verify

```bash
curl http://localhost:5000/health
```

## API Reference

All protected routes require `Authorization: Bearer <accessToken>`.

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ✗ | Register a new user |
| POST | `/auth/login` | ✗ | Login, receive access + refresh tokens |
| POST | `/auth/refresh` | ✗ | Exchange refresh token for new access token |
| POST | `/auth/logout` | ✗ | Blacklist refresh token |

### Users (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/profile` | ✓ | Get current user's profile |
| PATCH | `/api/users/profile` | ✓ | Update profile fields |

### Orders (`/api/orders`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | ✓ | Create order (`productName`, `quantity`, `price`) |
| GET | `/api/orders?page=1&limit=10` | ✓ | List orders (paginated) |
| GET | `/api/orders/:id` | ✓ | Get single order |
| PATCH | `/api/orders/:id/status` | ✓ | Advance status (state machine) |
| DELETE | `/api/orders/:id` | ✓ | Soft cancel (sets status to CANCELLED) |

**Order status transitions:**
```
PENDING → CONFIRMED → SHIPPED → DELIVERED
    └──────────────────────────────→ CANCELLED (any state)
```

## Rate Limiting

Every response includes standard rate limit headers:

```
X-RateLimit-Limit:     10
X-RateLimit-Remaining: 9
X-RateLimit-Reset:     1748867200
```

Role-based limits per 60-second window:

| Role | Limit |
|------|-------|
| admin | 100 req/min |
| premium | 50 req/min |
| user | 10 req/min |
| unauthenticated | 5 req/min |

## Circuit Breaker

Each downstream service (user-service, order-service) is wrapped in an opossum circuit breaker:

- **Closed** → normal operation
- **Open** → instant `503 Service Unavailable` (no downstream call)
- **Half-Open** → single test request after 10s reset timeout

Circuit state is tracked in Prometheus as `circuit_breaker_state{service="..."}`.

## Observability

```bash
# Prometheus metrics
curl http://localhost:5000/metrics

# Key metrics
http_requests_total{method, route, status}
http_request_duration_seconds{method, route, status}
circuit_breaker_state{service}
rate_limited_requests_total{ip}
```

Open Grafana at `http://localhost:3000` and add Prometheus as a data source (`http://prometheus:9090`).

## Running Tests

**Auth Service** (requires Docker postgres + redis running):

```bash
cd auth-service
npm test
```

**API Gateway** (fully mocked — no external deps):

```bash
cd api-gateway
npm test
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| auth-service | 13 | 78% |
| api-gateway | 7 | 93% |

## Project Structure

```
aegis-api/
├── api-gateway/
│   ├── src/
│   │   ├── config/          # Redis client
│   │   ├── middleware/       # auth, rateLimiter, logger, metrics
│   │   ├── routes/           # authRoutes, proxyRoutes
│   │   ├── utils/            # circuitBreaker, logger, metrics
│   │   └── app.js
│   └── __tests__/
├── auth-service/
│   ├── config/               # Redis client
│   ├── db/                   # Prisma client
│   ├── prisma/               # Schema + migrations
│   ├── app.js
│   └── __tests__/
├── user-service/
├── order-service/
├── docker-compose.yml
└── prometheus.yml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Circuit Breaker | opossum |
| Metrics | prom-client + Prometheus + Grafana |
| Logging | Winston (JSON structured logs) |
| Testing | Jest + Supertest + ioredis-mock |
| Containers | Docker + Docker Compose |
