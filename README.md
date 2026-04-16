# Draw Clash

Draw Clash is a realtime multiplayer browser drawing game inspired by the quick energy of party sketch games, rebuilt with a fully original flow and a polished dark UI.

## Stack

- React 19 + Vite + Material UI
- Node.js + Express + Socket.io
- Optional PostgreSQL persistence
- Shared TypeScript contracts across client and server

## Gameplay

- Join with a display name only
- Get matched into a public room or create a private code
- One player becomes the drawer each turn
- The drawer picks 1 of 3 words from a 1000+ word bank
- Everyone else guesses in the live chat
- Correct guessers score for speed, and the drawer earns bonus points
- The game rotates through multiple turns and declares a winner

## Features

- Realtime synchronized drawing canvas
- Pencil, eraser, brush sizes, color picker, undo, and clear canvas
- Live guessing chat with close-guess detection and spam protection
- Sound effects, emoji reactions, typing indicators, spectator mode, copy room code, fullscreen mode
- Reconnect support and AFK cleanup

## Quick Start

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:5173`

## Scripts

- `npm run dev` - client + server in watch mode
- `npm run dev:client` - Vite dev server only
- `npm run dev:server` - Express + Socket.io server only
- `npm run build` - production builds
- `npm run start` - production-style local run after build
- `npm run verify` - automated end-to-end smoke test for the Draw Clash flow

## Verify Locally

- `npm run build`
- `npm run verify`

The verify script builds both apps, starts the backend and Vite preview, then exercises a realtime private-room match where a drawer chooses a word, sends drawing events, and another player guesses correctly.

## Project Structure

- `client` - React frontend
- `server` - Express + Socket.io backend
- `shared` - shared constants, events, types, and word data
- `database` - optional PostgreSQL schema
- `scripts` - local verification helpers

## Environment

- `PORT` - backend port, defaults to `3001`
- `CLIENT_ORIGIN` - frontend origin for Socket.io CORS
- `DATABASE_URL` - optional Postgres connection string

By default, local development works without any environment files. Optional examples live in `server/.env.example` and `client/.env.example`.
