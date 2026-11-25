import express from "express";
import { client, getCollection, ensureTextIndex } from "./db.js";

const app = express();

// Quick check that the server is running
app.get("/", (req, res) => {
  res.send("Auction API running. Try /api/auctions/search?q=desk");
});

// GET /api/auctions/search?q=desk
// Returns the items that match the search word, best matches first.
app.get("/api/auctions/search", async (req, res) => {
  // 1. Read and check the search word from the address (the "?q=" part)
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q === "" || q.length > 100) {
    return res.status(400).json({
      error:
        "Please add a search word, for example ?q=desk (up to 100 characters).",
    });
  }

  try {
    // 2. Ask MongoDB for items that match, using the text index
    const items = await getCollection()
      .find(
        { $text: { $search: q } },
        {
          // MINIMUM DATA: only these fields are returned. reserve_price stays secret.
          projection: {
            title: 1,
            description: 1,
            start_price: 1,
          },
        },
      )
      .sort({ score: { $meta: "textScore" } }) // best match first
      .limit(10) // never send back more than 10
      .toArray();

    // 3. Send the result as JSON
    res.json({ count: items.length, items });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: "Something went wrong with the search." });
  }
});

// Connect to MongoDB first, then start listening
const PORT = process.env.PORT || 4000;

async function start() {
  await client.connect();
  await ensureTextIndex();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Could not start the server:", err.message);
  console.error("Is MongoDB running? Check with: brew services list");
  process.exit(1);
});
