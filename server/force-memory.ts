import "dotenv/config";

// Force in-memory mode by setting DATABASE_URL to empty string
console.log("⚠️  Forcing in-memory mode by setting DATABASE_URL to empty string");
process.env.DATABASE_URL = "";

// Import the main server entry point dynamically to ensure env var is set first
await import("./index");
