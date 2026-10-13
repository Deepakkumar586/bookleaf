import assert from "node:assert/strict";
import { after, test } from "node:test";
import mongoose from "mongoose";

process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/bookleaf-test";
process.env.JWT_SECRET ||= "bookleaf-test-secret";
process.env.NODE_ENV = "test";

mongoose.connect = async () => {
  mongoose.connection.readyState = 1;
  mongoose.connection.db = { admin: () => ({ ping: async () => ({ ok: 1 }) }) };
  return mongoose;
};

const [{ default: app }, { User }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/User.js"),
]);
const server = app.listen(0);
after(() => new Promise((resolve, reject) =>
  server.close((error) => error ? reject(error) : resolve())
));

const apiUrl = (path) => `http://127.0.0.1:${server.address().port}${path}`;

test("login preflight and route return CORS headers for the production frontend", async (t) => {
  await t.test("OPTIONS allows the login POST and required headers", async () => {
    const response = await fetch(apiUrl("/api/auth/login"), {
      method: "OPTIONS",
      headers: {
        Origin: "https://bookleaf-rouge.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://bookleaf-rouge.vercel.app");
    assert.match(response.headers.get("access-control-allow-methods"), /\bPOST\b/);
    assert.match(response.headers.get("access-control-allow-headers"), /\bcontent-type\b/i);
    assert.match(response.headers.get("access-control-allow-headers"), /\bauthorization\b/i);
  });

  await t.test("POST reaches the login controller and includes CORS on its error response", async () => {
    const originalFindOne = User.findOne;
    User.findOne = () => ({ select: async () => null });

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          Origin: "https://bookleaf-rouge.vercel.app",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "author@example.com", password: "not-a-password" }),
      });

      assert.equal(response.status, 401);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://bookleaf-rouge.vercel.app");
      assert.equal((await response.json()).error.code, "INVALID_CREDENTIALS");
    } finally {
      User.findOne = originalFindOne;
    }
  });
});
