#!/usr/bin/env node
import { randomBytes, scryptSync } from "node:crypto";

const pin = process.argv[2];
if (!pin) {
  console.error("Usage: node scripts/generate-pin-hash.mjs <PIN>");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(pin, salt, 32).toString("hex");
console.log(`${salt}$${hash}`);
