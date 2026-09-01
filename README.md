# Distributed API Gateway

A Node.js-based API Gateway project demonstrating reverse proxy,
load balancing, health checks, fault tolerance, authentication,
rate limiting, caching, and microservice architecture.

## Architecture

Client
   |
   v
API Gateway
   |
   +-------- User Service
   |
   +-------- Product Service
   |
   +-------- Order Service

## Current Services

| Service | Port | Purpose |
|---------|------|---------|
| User Service | 3001 | User management |
| Product Service | 3002 | Product management |
| Order Service | 3003 | Order management |
| API Gateway | 3000 | Request routing |

## Tech Stack

- Node.js
- Express.js
- Redis
- Docker
- MongoDB
- REST API

## Current Features

- User Service
- Product Service
- Order Service
- Health check endpoints
- REST APIs

## Planned Features

- Reverse Proxy
- API Gateway
- Load Balancing
- Health-based routing
- Automatic Failover
- Retry Mechanism
- JWT Authentication
- Rate Limiting
- Redis Caching
- Circuit Breaker
- Request Tracing
- Logging
- Docker
- Docker Compose
- Prometheus
- Grafana

## Running the Services

### User Service

```bash
cd services/user-service
npm install
node server.js