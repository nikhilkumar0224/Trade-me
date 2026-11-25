import { readFile } from "node:fs/promises";
import { client, getCollection, ensureTextIndex } from "./db.js";

// The word typed after "node seed.js", for example "seed" or "delete"
const command = process.argv[2];

// Check the data before saving it, so bad data is caught early
function checkItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("data/auctions.json must contain a list of items.");
  }
  items.forEach((item, index) => {
    const isValid =
      typeof item.title === "string" &&
      item.title.trim() !== "" &&
      typeof item.description === "string" &&
      item.description.trim() !== "" &&
      typeof item.start_price === "number" &&
      item.start_price >= 0 &&
      typeof item.reserve_price === "number" &&
      item.reserve_price >= item.start_price;

    if (!isValid) {
      throw new Error(
        `Item number ${index + 1} is not valid. It needs a title, a description, a start_price, and a reserve_price that is not below the start_price.`,
      );
    }
  });
}

async function seed() {
  // Read the seed data file that is stored in this repo
  const fileUrl = new URL("./data/auctions.json", import.meta.url);
  const items = JSON.parse(await readFile(fileUrl, "utf-8"));
  checkItems(items);

  const collection = getCollection();
  await collection.deleteMany({}); // start clean, so running the tool twice never makes duplicates
  const result = await collection.insertMany(items);
  await ensureTextIndex(); // makes keyword search possible

  console.log(`Seeded ${result.insertedCount} auction items.`);
}

async function removeAll() {
  const result = await getCollection().deleteMany({});
  console.log(`Deleted ${result.deletedCount} auction items.`);
}

async function main() {
  // If the command is not recognised, show how to use the tool
  if (command !== "seed" && command !== "delete") {
    console.log("Usage:");
    console.log("  npm run seed          add the sample auction items");
    console.log("  npm run seed:delete   delete all auction items");
    process.exitCode = 1;
    return;
  }

  try {
    await client.connect();
    if (command === "seed") {
      await seed();
    } else {
      await removeAll();
    }
  } catch (err) {
    console.error("Failed:", err.message);
    console.error("Is MongoDB running? Check with: brew services list");
    process.exitCode = 1;
  } finally {
    await client.close(); // always close the connection, or the program would hang
  }
}

main();
