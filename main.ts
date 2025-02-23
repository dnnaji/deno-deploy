import { Hono } from "hono";
import { Context, Next } from "hono";

// Rate limiting configuration
const RATE_LIMIT = 10; // Max requests allowed per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const KV_PREFIX = "rate_limit:"; // Prefix for Deno KV keys

// Get client IP from request headers
function getClientIp(c: Context): string {
  return c.req.header("x-forwarded-for") || "unknown";
}

// Rate limiting middleware
async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = getClientIp(c);
  const kvKey = `${KV_PREFIX}${ip}`;
  const kv = await Deno.openKv();

  // Fetch current request count from Deno KV
  const getRes = await kv.get<number>([kvKey]);
  const currentCount = getRes.value ?? 0; // Default to 0 if no entry exists
  const now = Date.now();
  let resetTime = now + WINDOW_MS; // Default reset time for new windows

  if (currentCount >= RATE_LIMIT) {
    // Check if the limit is exceeded and the window is still active
    const expireRes = await kv.get([kvKey, "expire"]);
    if (expireRes.value) {
      resetTime = Number(expireRes.value);
    }
    const remainingMs = resetTime - now;

    if (remainingMs > 0) {
      // Block the request and set headers
      c.header("ratelimit-limit", String(RATE_LIMIT));
      c.header("ratelimit-remaining", "0");
      c.header("ratelimit-reset", Math.ceil(remainingMs / 1000).toString());
      return c.text("Too Many Requests", 429);
    } else {
      // Reset the count if the window has expired
      await kv.set([kvKey], 1, { expireIn: WINDOW_MS });
      await kv.set([kvKey, "expire"], now + WINDOW_MS);
    }
  } else {
    // Increment the count and update Deno KV
    const newCount = currentCount + 1;
    await kv.set([kvKey], newCount, { expireIn: WINDOW_MS });
    if (currentCount === 0) {
      // Set expiration timestamp on the first request
      await kv.set([kvKey, "expire"], now + WINDOW_MS);
    }
  }

  // Set rate limit headers for successful requests
  const remaining = Math.max(0, RATE_LIMIT - (currentCount + 1));
  c.header("ratelimit-limit", String(RATE_LIMIT));
  c.header("ratelimit-remaining", String(remaining));
  c.header("ratelimit-reset", Math.ceil(WINDOW_MS / 1000).toString());

  // Proceed to the next middleware or route handler
  await next();
}

// Initialize Hono app
const app = new Hono();

// Apply rate limiting to all routes
app.use("*", rateLimitMiddleware);

// Sample route
app.get("/api/data", (c: Context) => c.text("Hello, Hono!"));

// Start the server
Deno.serve({ port: 8000 }, app.fetch);

console.log("Server running on http://localhost:8000");
