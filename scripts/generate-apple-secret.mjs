/**
 * One-off script to generate the Apple client secret JWT.
 * Run with: node scripts/generate-apple-secret.mjs
 *
 * Replace the four constants below with your Apple Developer values,
 * then paste the output into APPLE_CLIENT_SECRET in your .env
 *
 * The secret is valid for 6 months — regenerate before it expires.
 */

import { createSign } from "crypto";
import { readFileSync } from "fs";

// ── Fill these in ────────────────────────────────────────────────────────────
const TEAM_ID    = "XXXXXXXXXX";          // 10-char Team ID from developer.apple.com
const KEY_ID     = "XXXXXXXXXX";          // 10-char Key ID from the key you created
const CLIENT_ID  = "org.rsaerofkt.web";   // Your Services ID
const KEY_FILE   = "./AuthKey_XXXXXXXX.p8"; // Path to the downloaded .p8 file
// ─────────────────────────────────────────────────────────────────────────────

const privateKey = readFileSync(KEY_FILE, "utf8");
const now = Math.floor(Date.now() / 1000);
const expiry = now + 15777000; // ~6 months

const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID })).toString("base64url");
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp: expiry,
  aud: "https://appleid.apple.com",
  sub: CLIENT_ID,
})).toString("base64url");

const sign = createSign("SHA256");
sign.update(`${header}.${payload}`);
const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

const jwt = `${header}.${payload}.${signature}`;

console.log("\nYour APPLE_CLIENT_SECRET (valid ~6 months):\n");
console.log(jwt);
console.log("\nAdd this to your .env:\nAPPLE_CLIENT_SECRET=\"" + jwt + "\"\n");
