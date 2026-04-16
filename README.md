# Guess Where

A real-time multiplayer country guessing game built with React, Material UI, Express, and Socket.io.

## Requirements

- Node.js 20+
- npm 10+

`nvm use` will pick up the included `.nvmrc`.

## Quick Start

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:5173`

No environment file is required for the default local flow. The backend defaults to `http://localhost:3001`, and Postgres persistence stays optional.

## Verify Locally

- `npm run build` - production build for client and server
- `npm run verify` - builds the app, starts the backend plus frontend preview, checks the page loads, and runs a realtime Socket.io smoke test
- `npm run start` - runs the built backend and frontend preview together

## Scripts

- `npm run dev` - client + server in watch mode
- `npm run dev:client` - Vite dev server only
- `npm run dev:server` - Express + Socket.io server only
- `npm run build` - production builds
- `npm run start` - production-style local run after build
- `npm run verify` - automated end-to-end local smoke test

The repo also includes a GitHub Actions workflow that runs `npm run verify` on pushes and pull requests.

## Stack

- React 19 + Vite + Material UI
- Node.js + Express + Socket.io
- Optional PostgreSQL persistence

## Project Structure

- `client` - React frontend
- `server` - Express and Socket.io backend
- `shared` - shared constants, event names, and TypeScript contracts
- `database` - optional PostgreSQL schema

## Environment

- `PORT` - backend port, defaults to `3001`
- `CLIENT_ORIGIN` - frontend origin for Socket.io CORS
- `DATABASE_URL` - optional Postgres connection string

For custom local setup, copy `server/.env.example` to `server/.env`. The client can also use `client/.env.example` if you want to point the frontend at a different backend URL.

## Gameplay Notes

- Public matchmaking rooms auto-start when 4 players are present
- Private rooms auto-start when 2 players are present
- Hosts submit a short clue and choose the country their clue refers to
- Guessers score base points plus a speed bonus

## Optional PostgreSQL

Persistence is optional. If `DATABASE_URL` is set, run the schema in `database/schema.sql` first. Without it, the game still runs fully in memory.
