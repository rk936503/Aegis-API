# Aegis API

### A Distributed Gateway for Authentication, Rate Limiting, and Intelligent Routing

---

## Overview

**Aegis API** is a production-inspired API Gateway built with Node.js that acts as a centralized entry point for microservices. It handles authentication, rate limiting, and intelligent request routing while ensuring scalability, security, and performance.

This project demonstrates real-world backend engineering concepts used in modern distributed systems.

---

## Features

 **JWT Authentication** (Access + Refresh Tokens)
 **API Gateway Routing** (Single entry point for services)
 **Distributed Rate Limiting** using Redis
 **Request Logging & Monitoring**
 **Path Rewriting & Service Mapping**
 **Caching Layer (Redis)**
 **Asynchronous Job Processing**
 **Circuit Breaker for Fault Tolerance**

---

## 🚧 Progress

- ✅ Phase 1: API Gateway (Routing + Proxy)
- ✅ Phase 2: Authentication (JWT + Middleware)
- ✅ Phase 2.5: PostgreSQL + Prisma (Dockerized DB)
- ✅ Phase 3: Rate Limiting (Redis, Sliding Window)
- ✅ Phase 4: Structured Logging (Winston + Request Tracing)
- ⏳ Next: Monitoring & Metrics

---

## Architecture

Client → API Gateway → Auth → Rate Limiter → Service Routing → Response

* Gateway validates JWT
* Applies rate limiting per user/IP
* Routes request to appropriate microservice
* Logs request & response

---

## Tech Stack

* **Backend:** Node.js (Express)
* **Cache & Rate Limiting:** Redis
* **Database:** PostgreSQL
* **Authentication:** JWT + bcrypt
* **Queue :** RabbitMQ
* **Containerization :** Docker

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
│   │   └── app.js
│
├── auth-service/
├── user-service/
├── order-service/
│
└── README.md
```

---

## Getting Started

### 1️ Clone the repository

```bash
git clone https://github.com/your-username/aegis-api.git
cd aegis-api
```

### 2️ Install dependencies

```bash
cd api-gateway
npm install
```

### 3️ Setup environment variables

Create a `.env` file:

```
PORT=5000
JWT_SECRET=your_secret_key
REDIS_URL=redis://localhost:6379
```

### 4️ Start services

```bash
# Start gateway
node src/app.js

# Start other services in separate terminals
```

---

## API Endpoints

| Endpoint         | Description             |
| ---------------- | ----------------------- |
| `/api/users`     | Routes to User Service  |
| `/api/orders`    | Routes to Order Service |
| `/auth/login`    | User login              |
| `/auth/register` | User signup             |

---

## Example Flow

1. Client sends request → `/api/users`
2. Gateway verifies JWT
3. Rate limiter checks request quota
4. Request routed to User Service
5. Response returned via Gateway

---

## Key Decisions

* **Redis for rate limiting** → Fast in-memory operations
* **JWT for authentication** → Stateless & scalable
* **API Gateway pattern** → Centralized control & flexibility
* **Microservices separation** → Independent scaling

---

## Challenges Solved

* Handling high request throughput
* Preventing API abuse using rate limiting
* Designing stateless authentication
* Managing service routing dynamically

---

## Future Improvements

* Kubernetes deployment
* Distributed tracing (Jaeger)
* Advanced load balancing
* API analytics dashboard
* GraphQL gateway integration

---

## Resume Impact

> Built a distributed API Gateway handling authentication, rate limiting, and request routing using Node.js and Redis, demonstrating real-world microservices architecture and scalability concepts.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## License

MIT License

---

## Final Note

This project focuses on **backend engineering depth**, system design, and real-world scalability challenges rather than just CRUD operations.
