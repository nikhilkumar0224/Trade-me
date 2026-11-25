import express from "express";
import { ObjectId } from "mongodb";
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

// GET /api/auctions/:id/similar
// Returns up to 5 items that are similar to the item with this id.
app.get("/api/auctions/:id/similar", async (req, res) => {
  const { id } = req.params;

  // 1. A MongoDB id is exactly 24 letters and numbers (0-9 and a-f)
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return res.status(400).json({ error: "That is not a valid item id." });
  }

  try {
    const collection = getCollection();

    // 2. Find the item itself
    const item = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { title: 1 } },
    );
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    // 3. Search using the item's title, and leave out the item itself ($ne means "not equal")
    const similar = await collection
      .find(
        { $text: { $search: item.title }, _id: { $ne: item._id } },
        {
          // MINIMUM DATA again: no reserve_price
          projection: {
            title: 1,
            description: 1,
            start_price: 1,
          },
        },
      )
      .sort({ score: { $meta: "textScore" } }) // most similar first
      .limit(5)
      .toArray();

    res.json({ count: similar.length, items: similar });
  } catch (err) {
    console.error("Similar items failed:", err);
    res.status(500).json({ error: "Something went wrong." });
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
