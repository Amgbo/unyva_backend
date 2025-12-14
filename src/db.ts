// src/db.ts
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Validate required env vars for local dev
if (!process.env.DATABASE_URL) {
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`❌ Missing required environment variable: ${key}`);
    }
  }
}

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // production only
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT), // 5432
        user: process.env.DB_USER,         // unyva_dev
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,     // unyva_db_dev
      }
);

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err);
});
