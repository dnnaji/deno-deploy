import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { DenoKvStore } from "./deno-kv-store.ts";
import { Context } from "hono";

// Initialize Hono app
const app = new Hono();

// Open Deno KV connection
const kv = await Deno.openKv();
const store = new DenoKvStore(kv);

// Configure rate limiter middleware
app.use(
  "/api/*",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
    limit: 1, // Max 100 requests per window
    standardHeaders: true, // Include RateLimit headers
    keyGenerator: (c: Context) => c.req.header("x-forwarded-for") || "global", // Identify clients by IP
    store, // Custom Deno KV store
  })
);

// Sample route
app.get("/api/data", async (c: Context) => {
  const ouput = 'Hello, rate-limited world!' + await kv.get(["rate_limit", "global"]);
  return c.text(ouput);
});

// Start server
Deno.serve(app.fetch);
