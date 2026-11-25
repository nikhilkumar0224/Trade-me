import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "trademe";

// MongoDB is not running -- error --
export const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

// The auctions collect like a table created automatically when we first save into it.
export function getCollection() {
  return client.db(dbName).collection("auctions");
}

// text index lets MongoDB search words inside title and description.
// safe to run many times.
export async function ensureTextIndex() {
  await getCollection().createIndex({ title: "text", description: "text" });
}
