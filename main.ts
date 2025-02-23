import { Hono } from "hono";
import { Context } from "hono";

const app = new Hono();

app.get("/", (c: Context) => c.text("Hello, Hono!"));

// Start the server
Deno.serve(app.fetch);
