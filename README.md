# Trade Me Auction API (Phase 1)

A small API that searches auction items stored in a local MongoDB database. It returns
only the minimum data (title, description, start price) and keeps the reserve price secret.

## Setup

1. Install MongoDB and start it: `brew tap mongodb/brew`, `brew install mongodb-community@8.0`, `brew services start mongodb-community@8.0`
2. `npm install`
3. Seed the data: `npm run seed` (and `npm run seed:delete` removes it)
4. Start the API: `npm run dev`
5. Try it: http://localhost:4000/api/auctions/search?q=desk

## Seed data

The sample items are in `data/auctions.json` (title, description, start_price, reserve_price).
