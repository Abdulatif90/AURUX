# Aurux — Real Estate Platform API

A production-ready backend API for a full-featured real estate platform built with **NestJS**, **GraphQL**, and **MongoDB Atlas**. The system supports property listings, agent profiles, community articles, social interactions, and an automated ranking engine.

**Live:** [aurux.uz](http://aurux.uz/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Data Models & Indexes](#data-models--indexes)
- [API Design](#api-design)
- [Security](#security)
- [Batch Processing](#batch-processing)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Overview

Aurux is a GraphQL-first real estate API that connects **buyers**, **agents**, and **administrators**. Clients can browse property listings, follow agents, like listings, leave comments, and write community articles — all through a type-safe GraphQL schema.

The backend is split into two independently deployable services:

| Service | Purpose |
|---|---|
| `aurux-api` | Main GraphQL API — handles all client requests |
| `aurux-batch` | Scheduled job server — runs nightly ranking algorithms |

---

## Architecture

```
┌──────────────┐        ┌──────────────────────────────────────┐
│   Frontend   │──HTTP──▶  aurux-api  (NestJS + Apollo Server) │
│  (GraphQL)   │        │                                      │
└──────────────┘        │  JWT Guard → Resolver → Service      │
                        │                   ↓                  │
                        │          MongoDB Atlas               │
                        │          (Replica Set)               │
                        └──────────────────────────────────────┘

                        ┌──────────────────────────────────────┐
                        │  aurux-batch  (NestJS + Cron)        │
                        │  Ranking Engine (nightly cron jobs)  │
                        │                   ↓                  │
                        │          MongoDB Atlas               │
                        └──────────────────────────────────────┘
```

### Key Design Decisions

- **GraphQL Code-First** — all types, inputs, and resolvers are declared in TypeScript with NestJS decorators; no separate `.graphql` files.
- **ACID Transactions** — multi-document writes (e.g. create property + increment member stats) are wrapped in MongoDB `session.withTransaction()` for full atomicity.
- **Role-Based Access Control** — three member roles (`USER`, `AGENT`, `ADMIN`) enforced via custom NestJS guards on every resolver.
- **Single-Roundtrip Pagination** — all list queries use MongoDB `$facet` to return the data page and total count in one aggregation pipeline.
- **Separated Ranking Workload** — nightly rank calculations run in an isolated `aurux-batch` service so they never affect API latency.

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| API Layer | GraphQL 16 + Apollo Server 4 |
| ODM | Mongoose 8 |
| Database | MongoDB Atlas (Replica Set — required for ACID transactions) |
| Auth | JWT (`@nestjs/jwt`) + bcryptjs (10 salt rounds) |
| Validation | class-validator + class-transformer |
| Scheduling | `@nestjs/schedule` (cron jobs) |
| Language | TypeScript 5 |

---

## Features

### Member System
- Signup and login with phone number and bcrypt-hashed password
- Three roles: `USER`, `AGENT`, `ADMIN` — enforced at resolver level via guards and decorators
- Profile image upload (UUID-based filenames, validated MIME types)
- Denormalized stat counters: properties, articles, followers, followings, likes, views, comments, rank

### Property Listings
- Full CRUD for property listings: Apartment, Villa, House
- Listings cover 9 South Korean cities (Seoul, Busan, Incheon, Daegu, Gyeongju, Gwangju, Jeonju, Daejeon, Jeju)
- Rich filtering: location, type, rooms, beds, price range, area range, construction period, full-text search
- Status lifecycle: `ACTIVE` → `HOLD` → `SOLD` / `DELETE` with `soldAt` / `deletedAt` timestamps
- Favorites (liked properties) and visited properties history per member
- Admin panel with unrestricted access to all properties across all statuses

### Community Board
- Article creation and editing with category tags: `FREE`, `RECOMMEND`, `NEWS`, `HUMOR`
- Article like toggle and view tracking
- Soft delete with member article counter kept in sync via transaction

### Social Graph
- Follow and unfollow agents atomically — follower and following counters updated in the same transaction as the follow record
- Self-follow prevented at service level
- Paginated followers and followings lists with `meFollowed` membership flag

### Reactions (Likes & Views)
- Like / unlike toggle on properties, articles, and member profiles
- Like counts updated atomically in the same transaction as the like record
- `meLiked` and `meFollowed` flags injected into all list responses via `$lookup` aggregation pipeline stages — no extra round-trips
- Unique view recording per (member, target, group) — duplicate visits silently ignored using MongoDB's unique index and duplicate-key error code `11000`

### Ranking Engine
- Automated nightly ranking via the `aurux-batch` service
- Property rank: `likes × 2 + views × 1`
- Agent rank: `properties × 5 + articles × 3 + likes × 2 + views × 1`
- Daily rollback resets ranks to zero before recalculation to prevent rank inflation

---

## Project Structure

```
aurux/
├── apps/
│   ├── aurux-api/                   # Main GraphQL API
│   │   └── src/
│   │       ├── components/          # Feature modules (resolver + service per feature)
│   │       │   ├── auth/            # JWT guards, roles guard, @AuthMember decorator
│   │       │   ├── member/          # Signup, login, profile, agent listings
│   │       │   ├── property/        # CRUD, search, likes, view tracking
│   │       │   ├── board-article/   # Community posts
│   │       │   ├── comment/         # Comments on properties, articles, members
│   │       │   ├── follow/          # Follow/unfollow social graph
│   │       │   ├── like/            # Like toggle, favorites list
│   │       │   └── view/            # View recording, visited properties list
│   │       ├── libs/
│   │       │   ├── dto/             # GraphQL @InputType / @ObjectType classes
│   │       │   ├── enums/           # Shared enums registered with GraphQL
│   │       │   └── types/           # Generic TypeScript utilities
│   │       └── schemas/             # Mongoose schema definitions and indexes
│   └── aurux-batch/                 # Scheduled ranking jobs
│       └── src/
│           ├── aurux-batch.service.ts   # batchRollback, batchTopProperties, batchTopAgents
│           └── aurux-batch.module.ts
├── tsconfig.json
└── package.json
```

---

## Data Models & Indexes

### Member
| Field | Type | Notes |
|---|---|---|
| `memberType` | `USER \| AGENT \| ADMIN` | Role |
| `memberNick` | String | Unique sparse index |
| `memberPhone` | String | Unique sparse index |
| `memberPassword` | String | `select: false` — excluded from queries by default |
| `memberRank` | Number | Recalculated nightly by batch |
| `memberProperties`, `memberFollowers`, … | Number | Denormalized counters |

### Property
| Field | Type | Notes |
|---|---|---|
| `propertyType` | `APARTMENT \| VILLA \| HOUSE` | |
| `propertyStatus` | `ACTIVE \| HOLD \| SOLD \| DELETE` | Soft delete |
| `propertyLocation` | 9 Korean cities | |
| `propertyRank` | Number | Recalculated nightly |
| `soldAt` / `deletedAt` | Date | Set on status transition |

### Indexes (tuned to actual query patterns)

| Collection | Index | Covers |
|---|---|---|
| `members` | `{ memberType, memberStatus }` | Agent listing queries |
| `members` | `{ memberStatus }` | Admin member queries |
| `members` | `{ memberNick }` unique | Login |
| `properties` | `{ propertyStatus, createdAt }` | Public property browsing (default sort) |
| `properties` | `{ memberId, propertyStatus, createdAt }` | Agent's own listings |
| `comments` | `{ commentRefId, commentStatus, createdAt }` | Comment threads |
| `comments` | `{ memberId, commentStatus, createdAt }` | Member's comments |
| `follows` | `{ followingId, followerId }` unique | Duplicate prevention + followers list |
| `follows` | `{ followerId, followingId }` | Followings list |
| `likes` | `{ memberId, likeRefId }` unique | Toggle lookup + duplicate prevention |
| `likes` | `{ memberId, likeGroup, updatedAt }` | Favorites list queries |
| `views` | `{ memberId, viewRefId, viewGroup }` unique | Duplicate prevention |
| `views` | `{ memberId, viewGroup, updatedAt }` | Visited properties list |

---

## API Design

All operations are GraphQL queries and mutations served at a single `/graphql` endpoint.

```graphql
# Public — browse properties with filters and pagination
query GetProperties($input: PropertiesInquiry!) {
  getProperties(input: $input) {
    list {
      _id
      propertyTitle
      propertyPrice
      propertyLocation
      propertyLikes
      propertyViews
      meLiked { myFavorite }
      memberData { memberNick memberImage }
    }
    metaCounter { total }
  }
}

# Authenticated — create a property listing
mutation CreateProperty($input: PropertyInput!) {
  createProperty(input: $input) {
    _id
    propertyTitle
    propertyStatus
  }
}

# Authenticated — follow an agent
mutation Subscribe($input: String!) {
  subscribe(input: $input) {
    followingId
    followerId
  }
}

# Admin only — list all members
query GetAllMembersByAdmin($input: MembersInquiry!) {
  getAllMembersByAdmin(input: $input) {
    list { _id memberNick memberStatus memberType }
    metaCounter { total }
  }
}
```

### Pagination
All list queries use consistent offset-based pagination with a 100-item cap:
```graphql
input PropertiesInquiry {
  page: Int!       # 1-based page number
  limit: Int!      # max 100, enforced by @Max(100) validator
  sort: String
  direction: Direction
  search: PISearch!
}
```

---

## Security

| Concern | Implementation |
|---|---|
| Authentication | JWT Bearer token verified on every request by `AuthGuard` |
| Authorization | `@Roles()` decorator + `RolesGuard` enforces admin-only endpoints at resolver level |
| Password storage | bcrypt with 10 salt rounds; `memberPassword` has `select: false` |
| Password in aggregations | All `$lookup` pipelines on the members collection explicitly project out `memberPassword` |
| Input validation | `ValidationPipe` with `whitelist: true` strips unknown fields on every request |
| ObjectId injection | `shapeIntoMongoObjectId()` validates format with `ObjectId.isValid()` before any DB use |
| ReDoS prevention | `escapeRegExp()` applied to all user-supplied strings before `new RegExp()` |
| File path traversal | Upload `target` parameter validated against `/^[a-z0-9_-]+$/i` before use in file paths |
| Pagination abuse | `@Max(100)` on all `limit` fields — enforced by class-validator |
| Transaction atomicity | All multi-step writes wrapped in `session.withTransaction()` — partial writes cannot persist |

---

## Batch Processing

The `aurux-batch` service connects to the same MongoDB Atlas cluster and runs independently from the API server. It uses `@nestjs/schedule` cron jobs:

1. **Rollback** — resets all `propertyRank` and `memberRank` fields to `0` via `updateMany`
2. **Top Properties** — for each unranked active property: `rank = likes × 2 + views × 1`
3. **Top Agents** — for each unranked active agent: `rank = properties × 5 + articles × 3 + likes × 2 + views × 1`

Separating this workload means ranking computation never competes with real-time API requests.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster with a **replica set** (required for multi-document ACID transactions)

### Install dependencies
```bash
npm install
```

### Run in development
```bash
# API server (watch mode)
npm run start:dev

# Batch server (separate terminal)
npm run start:dev:batch
```

### Build and run in production
```bash
npm run build
npm run start:prod        # API server
npm run start:prod:batch  # Batch server
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3003
DB_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=your-secret-key
JWT_EXPIRATION=604800
```

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on |
| `DB_URL` | MongoDB Atlas connection string (must be a replica set) |
| `JWT_SECRET` | Secret used to sign and verify JWT tokens |
| `JWT_EXPIRATION` | Token lifetime in seconds (`604800` = 7 days) |
