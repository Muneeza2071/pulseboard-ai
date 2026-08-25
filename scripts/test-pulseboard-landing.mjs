import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const page = readFileSync(join(root, "app", "page.tsx"), "utf8");
const landing = readFileSync(join(root, "components", "PublicLanding.tsx"), "utf8");
const css = readFileSync(join(root, "app", "landing.css"), "utf8");

assert.match(page, /if \(!authenticatedName\) return <PublicLanding onAuthenticated=\{setAuthenticatedName\} \/>;/, "guest users must see the public landing while signed-in users retain the app shell");
assert.match(landing, /Customer intelligence that stays/, "landing must explain the actual customer-intelligence purpose");
assert.match(landing, /no fabricated revenue and no invented customer records/i, "landing must preserve the no-fake-data boundary");
assert.match(landing, /actionLabel="Open secure workspace"/, "landing CTA must use the existing secure access flow");
assert.match(landing, /GitHub and HubSpot connection paths are user-authorised and manual/i, "landing must not overstate integration automation");
assert.match(landing, /not a claim of a third-party security audit/i, "landing must not overstate security validation");
assert.match(css, /\.landing-page/, "landing needs dedicated scoped styling");
assert.match(css, /@media \(max-width: 540px\)/, "landing needs a small-screen responsive layout");
assert.doesNotMatch(landing, /500\+|enterprise[- ]ready|fully automated/i, "landing must avoid unsupported scale or maturity claims");

console.log("PulseBoard landing contract passed.");
