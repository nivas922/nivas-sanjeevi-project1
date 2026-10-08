import assert from "assert";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { initDb, dbRun } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { AuthService } from "../src/services/authService.js";
import { storageService } from "../../frontend/src/services/storageService.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5569;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

// Simple mock for browser localStorage in Node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  };
}

const runPhase1Tests = async () => {
  console.log("\n🧪 Running Phase 1 Focused Authentication Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM users WHERE email_or_mobile LIKE '%phase1%'");

  server = app.listen(PORT);
  console.log(` Test server listening on port ${PORT}\n`);

  try {
    // -----------------------------------------------------------------
    // CASE 1: Missing Google ID token is rejected
    // -----------------------------------------------------------------
    console.log("[Case 1] Missing Google ID token is rejected");
    const missingRes = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.ok(missingRes.status === 400 || missingRes.status === 401, `Expected 400 or 401, got ${missingRes.status}`);
    const missingData = await missingRes.json();
    assert.strictEqual(missingData.success, false);
    console.log("✔ Case 1 Passed: Missing Google ID token is rejected cleanly.\n");

    // -----------------------------------------------------------------
    // CASE 2: Malformed Google ID token is rejected cleanly
    // -----------------------------------------------------------------
    console.log("[Case 2] Malformed Google ID token is rejected cleanly");
    const malformedTokens = [
      "demo_google_id_token_12345",
      "not-a-jwt",
      "one.two",
      "one.two.three.four"
    ];
    for (const badToken of malformedTokens) {
      const malformedRes = await fetch(`${BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: badToken })
      });
      assert.strictEqual(malformedRes.status, 401);
      const malformedData = await malformedRes.json();
      assert.strictEqual(malformedData.success, false);
      assert.ok(malformedData.error.includes("malformed ID token") || malformedData.error.includes("Google verification failed"));
    }
    console.log("✔ Case 2 Passed: Malformed Google ID tokens rejected cleanly with 401.\n");

    // -----------------------------------------------------------------
    // CASE 3: Invalid Google ID token is rejected
    // -----------------------------------------------------------------
    console.log("[Case 3] Invalid Google ID token is rejected");
    const invalidRes = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: "invalid.header.signature" })
    });
    assert.ok(invalidRes.status === 401 || invalidRes.status === 500, `Expected 401/500, got ${invalidRes.status}`);
    const invalidData = await invalidRes.json();
    assert.strictEqual(invalidData.success, false);
    console.log("✔ Case 3 Passed: Invalid Google ID token is rejected without bypass.\n");

    // -----------------------------------------------------------------
    // CASE 4: Missing Google Client ID does not trigger demo login
    // -----------------------------------------------------------------
    console.log("[Case 4] Missing Google Client ID does not trigger demo login");
    const origClientId = env.GOOGLE_CLIENT_ID;
    try {
      env.GOOGLE_CLIENT_ID = "";
      let errorThrown = false;
      try {
        await AuthService.handleGoogleAuth({ id_token: "sample.three.parts" });
      } catch (err) {
        errorThrown = true;
        assert.ok(
          err.message.includes("GOOGLE_CLIENT_ID is not configured") ||
          err.message.includes("Google verification failed"),
          `Expected missing config error, got: ${err.message}`
        );
      }
      assert.ok(errorThrown, "Should not succeed when GOOGLE_CLIENT_ID is missing");
    } finally {
      env.GOOGLE_CLIENT_ID = origClientId;
    }
    console.log("✔ Case 4 Passed: Missing Google Client ID raises error and does NOT trigger demo login.\n");

    // -----------------------------------------------------------------
    // CASE 5: Fake tokens are not accepted as real authentication
    // -----------------------------------------------------------------
    console.log("[Case 5] Fake tokens are not accepted as real authentication");
    const fakeTokens = [
      "fake_token_12345",
      "mock_jwt_google_1710000000000",
      "jwt_token_1710000000000"
    ];
    for (const fakeToken of fakeTokens) {
      const fakeRes = await fetch(`${BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: fakeToken })
      });
      assert.strictEqual(fakeRes.status, 401);
      const fakeData = await fakeRes.json();
      assert.strictEqual(fakeData.success, false);
    }
    console.log("✔ Case 5 Passed: Fabricated tokens are rejected.\n");

    // -----------------------------------------------------------------
    // CASE 6: Successful Google verification results in a backend-issued application JWT
    // -----------------------------------------------------------------
    console.log("[Case 6] Successful Google verification results in a backend-issued application JWT");
    const testEmail = `phase1.user.${Date.now()}@university.edu`;
    const validRes = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: `mock_valid_google_token_${testEmail}`,
        department: "Computer Science & Engineering (CSE)"
      })
    });
    assert.strictEqual(validRes.status, 200);
    const validData = await validRes.json();
    assert.strictEqual(validData.success, true);
    assert.ok(validData.token, "Backend must issue an application JWT");
    assert.strictEqual(typeof validData.token, "string");

    // Verify token was signed with the backend's JWT_SECRET
    const decoded = jwt.verify(validData.token, env.JWT_SECRET);
    assert.strictEqual(decoded.id, validData.user.id);
    console.log("✔ Case 6 Passed: Valid verification produces authentic backend-signed JWT.\n");

    // -----------------------------------------------------------------
    // CASE 7: Invalid or expired application JWTs do not authenticate protected requests
    // -----------------------------------------------------------------
    console.log("[Case 7] Invalid or expired application JWTs do not authenticate protected requests");
    // 7a: Random string token
    const invalidAuthRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: "Bearer totally_invalid_jwt_token" }
    });
    assert.strictEqual(invalidAuthRes.status, 401);
    const invalidAuthData = await invalidAuthRes.json();
    assert.strictEqual(invalidAuthData.success, false);

    // 7b: Expired token
    const expiredToken = jwt.sign(
      { id: validData.user.id, email_or_mobile: testEmail },
      env.JWT_SECRET,
      { expiresIn: "0s" }
    );
    const expiredAuthRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.strictEqual(expiredAuthRes.status, 401);
    const expiredAuthData = await expiredAuthRes.json();
    assert.strictEqual(expiredAuthData.success, false);
    assert.ok(expiredAuthData.error.includes("Invalid or expired") || expiredAuthData.error.includes("jwt expired"));

    // 7c: Genuine token authenticates successfully
    const genuineAuthRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${validData.token}` }
    });
    assert.strictEqual(genuineAuthRes.status, 200);
    const genuineAuthData = await genuineAuthRes.json();
    assert.strictEqual(genuineAuthData.user.email, testEmail);
    console.log("✔ Case 7 Passed: Invalid/expired JWTs fail with 401; genuine backend JWT succeeds.\n");

    // -----------------------------------------------------------------
    // CASE 8: Authentication failures do not leave a fake token stored in the frontend
    // -----------------------------------------------------------------
    console.log("[Case 8] Authentication failures do not leave a fake token stored in frontend");
    // 8a: Storing a fake token is rejected and scrubbed by storageService.getToken()
    localStorage.setItem("learnai_auth_token_v3", "mock_jwt_google_12345");
    assert.strictEqual(storageService.getToken(), null, "mock_jwt_ tokens must be purged");
    assert.strictEqual(localStorage.getItem("learnai_auth_token_v3"), null);

    localStorage.setItem("learnai_auth_token_v3", "jwt_token_123456789");
    assert.strictEqual(storageService.getToken(), null, "jwt_token_ tokens must be purged");

    localStorage.setItem("learnai_auth_token_v3", "demo_google_id_token_12345");
    assert.strictEqual(storageService.getToken(), null, "demo_google_id_token_12345 must be purged");

    // 8b: Genuine 3-segment JWT is preserved
    storageService.setToken(validData.token);
    assert.strictEqual(storageService.getToken(), validData.token, "Genuine JWT must be returned");

    // 8c: Calling initNewUser does NOT overwrite or generate a fake token
    storageService.initNewUser({ name: "Test Student" });
    assert.strictEqual(storageService.getToken(), validData.token, "initNewUser must not overwrite real token with fake token");

    // 8d: Calling removeToken clears state
    storageService.removeToken();
    assert.strictEqual(storageService.getToken(), null, "removeToken must clear stored token");
    console.log("✔ Case 8 Passed: Frontend strictly purges fake tokens and only stores genuine backend JWTs.\n");

    console.log("🎉 ALL 8 PHASE 1 AUTHENTICATION TEST CASES PASSED SUCCESSFULLY!\n");
  } finally {
    if (server) {
      server.close();
    }
  }
};

runPhase1Tests().catch((err) => {
  console.error("❌ Test Suite Failed:", err);
  if (server) server.close();
  process.exit(1);
});
