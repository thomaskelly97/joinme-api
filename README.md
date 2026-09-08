# Joinme API

Joinme API is the backend for the Joinme social events app. It provides the data and endpoints the app uses to create events and communities, manage users, and record attendance intent.

## Product Pitch

The API lets Joinme power social discovery around events and communities. It supports the core flows of browsing events, creating community spaces, joining groups, and tracking whether a user is going or interested in an event.

## Current Features

- Users: list, create, update, fetch by id, delete
- Events: list, create, update, fetch by id, delete
- Event RSVP flow: read, upsert, and delete RSVP status (`going` or `interested`)
- Event summaries include a `goingCount`
- Communities: list, create, fetch by id, delete
- Community membership: join, leave
- Community summaries include a `memberCount`
- Optional base64 image uploads for events and communities
- Static serving of uploaded files from `/uploads`
- Health check at `GET /health`

## Technologies Used

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- `@fastify/static`
- `dotenv`
- `tsx` for local development

## Setup

```bash
npm install
```

Create a `.env` file with a `DATABASE_URL` for PostgreSQL, then run:

```bash
npx prisma generate
npm run dev
```

The API listens on `http://localhost:3001` in development.

To build and run the compiled server:

```bash
npm run build
npm start
```

## Architecture

- `src/server.ts` is the application entry point. It loads environment variables, creates the Fastify server, registers static file serving, mounts the route modules, exposes `/health`, and starts listening on port `3001`.
- `src/routes/events.ts`, `src/routes/users.ts`, and `src/routes/communities.ts` hold the route handlers. There is no separate controller layer or service layer yet; the route modules contain the request logic directly.
- `src/db.ts` exports a shared Prisma client instance used by the routes.
- `prisma/schema.prisma` defines the data models: `User`, `Event`, `Community`, `CommunityMember`, and `EventRsvp`.
- Middleware/plugins are minimal: Fastify logging, a 10 MB body limit, and `@fastify/static` for uploaded files. There are no custom middleware modules in the repository.
- Configuration is environment-based through `dotenv/config`. The code currently depends on `DATABASE_URL` for Prisma and stores uploads under an `uploads/` directory.
- Database integration uses Prisma migrations against PostgreSQL. The API reads and writes directly through Prisma client calls in the route handlers.

## TODO

- [ ] Review entities
- [ ] Update event entity to keep track of what users are going / interested
