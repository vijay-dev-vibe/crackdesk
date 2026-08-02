#!/usr/bin/env node

/**
 * security-audit.js
 * Run from your project root: node security-audit.js
 * Optionally pass your live URL:  node security-audit.js https://yoursite.com
 *
 * Checks: env secrets, git history, .gitignore, deps (npm audit),
 *         HTTP headers, HTTPS/HSTS, CORS, CSP, Supabase RLS hints,
 *         hardcoded secrets in source, and more.
 *
 * Requirements: Node 18+  (uses built-in fetch)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const LIVE_URL = process.argv[2] || null;
const ROOT = process.cwd();

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

let passed = 0;
let failed = 0;
let warned = 0;
const issues = [];

function ok(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
  passed++;
}
function fail(msg, hint = "") {
  console.log(`  ${RED}✗${RESET} ${BOLD}${msg}${RESET}${hint ? `\n    ${DIM}→ ${hint}${RESET}` : ""}`);
  failed++;
  issues.push({ level: "FAIL", msg, hint });
}
function warn(msg, hint = "") {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}${hint ? `\n    ${DIM}→ ${hint}${RESET}` : ""}`);
  warned++;
  issues.push({ level: "WARN", msg, hint });
}
function section(title) {
  console.log(`\n${CYAN}${BOLD}── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}${RESET}`);
}
function info(msg) {
  console.log(`  ${DIM}${msg}${RESET}`);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fileExists(f) {
  return fs.existsSync(path.join(ROOT, f));
}

function readFile(f) {
  try {
    return fs.readFileSync(path.join(ROOT, f), "utf8");
  } catch {
    return null;
  }
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
  } catch (e) {
    return e.stdout || e.stderr || "";
  }
}

function grepSource(pattern, extensions = [".js", ".ts", ".jsx", ".tsx", ".mjs"]) {
  const results = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", ".next", "dist", "build", ".vercel"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some((e) => entry.name.endsWith(e))) {
        const content = fs.readFileSync(full, "utf8");
        const re = typeof pattern === "string" ? new RegExp(pattern, "gi") : pattern;
        if (re.test(content)) results.push(path.relative(ROOT, full));
      }
    }
  }
  walk(ROOT);
  return results;
}

async function fetchHeaders(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 8000 }, (res) => {
      resolve({ status: res.statusCode, headers: res.headers, finalUrl: url });
      res.resume();
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

async function fetchFollowRedirects(url, maxRedirects = 5) {
  let current = url;
  let hops = 0;
  const chain = [];
  while (hops < maxRedirects) {
    const r = await fetchHeaders(current);
    if (!r) return { chain, final: null };
    chain.push({ url: current, status: r.status, headers: r.headers });
    if ([301, 302, 307, 308].includes(r.status) && r.headers.location) {
      const next = r.headers.location.startsWith("http")
        ? r.headers.location
        : new URL(r.headers.location, current).href;
      current = next;
      hops++;
    } else {
      return { chain, final: r };
    }
  }
  return { chain, final: null };
}

// ─── 1. .gitignore ───────────────────────────────────────────────────────────

section("1. .gitignore");
const gitignore = readFile(".gitignore");
if (!gitignore) {
  fail(".gitignore not found", "Create one immediately — secrets could be committed.");
} else {
  const must = [".env", ".env.local", ".env*.local", "*.env"];
  must.forEach((p) => {
    if (gitignore.includes(p)) ok(`.gitignore covers ${p}`);
    else warn(`.gitignore missing ${p}`, `Add: echo '${p}' >> .gitignore`);
  });
}

// ─── 2. .env files ───────────────────────────────────────────────────────────

section("2. .env files & secrets exposure");
const envFiles = [".env", ".env.local", ".env.development", ".env.production"];
envFiles.forEach((f) => {
  if (fileExists(f)) {
    info(`Found ${f} — checking for dangerous patterns...`);
    const content = readFile(f);
    if (/NEXT_PUBLIC_.*SERVICE_ROLE/i.test(content))
      fail(`${f}: SUPABASE SERVICE_ROLE key exposed as NEXT_PUBLIC_!`, "Remove NEXT_PUBLIC_ prefix — this key must stay server-side.");
    else ok(`${f}: no service_role key exposed publicly`);
    if (/NEXT_PUBLIC_.*SECRET/i.test(content))
      warn(`${f}: A key named SECRET is marked NEXT_PUBLIC_`, "Secrets should never be public.");
    if (/NEXT_PUBLIC_.*PRIVATE/i.test(content))
      fail(`${f}: A PRIVATE key is marked NEXT_PUBLIC_`, "Remove NEXT_PUBLIC_ prefix.");
  }
});

// ─── 3. Git history secret scan ──────────────────────────────────────────────

section("3. Git history — accidental secret commits");
const gitLog = run('git log --all --oneline --diff-filter=A -- ".env*" "*.env" 2>&1');
if (gitLog.trim()) {
  fail("Env files appear in git history!", `Files: ${gitLog.trim()}\n    → Run: git filter-repo --path .env --invert-paths`);
} else {
  ok("No .env files found in git history");
}

const secretPatterns = [
  "supabase.*service_role",
  "sk_live_",
  "rk_live_",
  "PRIVATE_KEY.*=.*[A-Za-z0-9+/]{20,}",
];
secretPatterns.forEach((p) => {
  const result = run(`git log --all -p --pickaxe-regex -S"${p}" -- 2>&1 | head -5`);
  if (result.trim()) {
    fail(`Possible secret pattern "${p}" found in git history`, "Rotate the key immediately then purge history.");
  } else {
    ok(`No "${p}" pattern in git history`);
  }
});

// ─── 4. Hardcoded secrets in source ──────────────────────────────────────────

section("4. Hardcoded secrets in source files");
const secretRegexes = [
  { label: "Supabase service_role key", pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}/g },
  { label: "Stripe live secret key", pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { label: "Stripe restricted key", pattern: /rk_live_[A-Za-z0-9]{24,}/g },
  { label: "Private key block", pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  { label: "AWS secret access key", pattern: /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9]).*(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g },
];

secretRegexes.forEach(({ label, pattern }) => {
  const hits = grepSource(pattern);
  if (hits.length) fail(`${label} possibly hardcoded in: ${hits.join(", ")}`, "Move to env vars immediately.");
  else ok(`No hardcoded ${label} found`);
});

// ─── 5. NEXT_PUBLIC_ audit ───────────────────────────────────────────────────

section("5. NEXT_PUBLIC_ variable audit");
const allEnvContent = envFiles.map((f) => readFile(f) || "").join("\n");
const publicVars = [...allEnvContent.matchAll(/^(NEXT_PUBLIC_\w+)=/gm)].map((m) => m[1]);
if (publicVars.length === 0) {
  info("No NEXT_PUBLIC_ vars found (or no .env files present).");
} else {
  publicVars.forEach((v) => {
    const isSafe = /NEXT_PUBLIC_(SUPABASE_URL|SUPABASE_ANON_KEY|SITE_URL|APP_NAME|APP_URL|GA_|GTAG)/.test(v);
    if (isSafe) ok(`${v} — looks safe to be public`);
    else warn(`${v} — verify this is safe to expose to browsers`, "Anything secret must NOT have NEXT_PUBLIC_ prefix.");
  });
}

// ─── 6. npm audit ────────────────────────────────────────────────────────────

section("6. npm audit — known vulnerabilities");
info("Running npm audit (this may take a moment)...");
const auditOut = run("npm audit --json 2>&1");
try {
  const audit = JSON.parse(auditOut);
  const vuln = audit.metadata?.vulnerabilities || {};
  const critical = vuln.critical || 0;
  const high = vuln.high || 0;
  const moderate = vuln.moderate || 0;
  const low = vuln.low || 0;
  if (critical > 0) fail(`npm audit: ${critical} CRITICAL vulnerabilities`, "Run: npm audit fix --force (check for breaking changes)");
  else ok("No critical npm vulnerabilities");
  if (high > 0) fail(`npm audit: ${high} HIGH vulnerabilities`, "Run: npm audit fix");
  else ok("No high npm vulnerabilities");
  if (moderate > 0) warn(`npm audit: ${moderate} moderate vulnerabilities`, "Run: npm audit for details");
  else ok("No moderate npm vulnerabilities");
  if (low > 0) info(`${low} low-severity vulnerabilities (review when convenient)`);
} catch {
  const lines = auditOut.split("\n").slice(0, 5).join(" ");
  if (/found 0/.test(lines)) ok("npm audit: no vulnerabilities found");
  else warn("Could not parse npm audit output", lines.slice(0, 120));
}

// ─── 7. Outdated packages ────────────────────────────────────────────────────

section("7. Outdated packages");
const outdated = run("npm outdated --json 2>&1");
try {
  const obj = JSON.parse(outdated);
  const keys = Object.keys(obj);
  if (keys.length === 0) ok("All packages are up to date");
  else {
    const major = keys.filter((k) => obj[k].current?.split(".")[0] !== obj[k].latest?.split(".")[0]);
    if (major.length > 0)
      warn(`${major.length} packages have major version updates: ${major.slice(0, 5).join(", ")}`, "Review changelogs before upgrading majors.");
    else ok(`${keys.length} minor/patch updates available (no major version gaps)`);
  }
} catch {
  ok("npm outdated check complete (no JSON output = all current)");
}

// ─── 8. Supabase RLS hints ───────────────────────────────────────────────────

section("8. Supabase — RLS & key usage hints");
const supabaseFiles = grepSource(/createClient|supabaseClient|supabase\.from/);
if (supabaseFiles.length === 0) {
  info("No Supabase client usage found in source.");
} else {
  info(`Supabase client used in: ${supabaseFiles.join(", ")}`);
  const serviceKeyInFrontend = grepSource(/SERVICE_ROLE|service_role/);
  if (serviceKeyInFrontend.length > 0)
    fail(`service_role key referenced in source files: ${serviceKeyInFrontend.join(", ")}`, "Service role must ONLY be used in server-side code (API routes, server actions).");
  else ok("No service_role key references in source");

  const anonKeyPublic = grepSource(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  if (anonKeyPublic.length > 0) ok("Using NEXT_PUBLIC_SUPABASE_ANON_KEY (anon key — safe to be public)");

  info("⚠  Cannot auto-check RLS from CLI — manually verify in Supabase Dashboard → Table Editor → each table → RLS enabled.");
  info("   Also verify: Dashboard → Auth → Policies — every table has appropriate SELECT/INSERT/UPDATE/DELETE policies.");
}

// ─── 9. dangerouslySetInnerHTML / eval / innerHTML ────────────────────────────

section("9. XSS sinks — dangerouslySetInnerHTML / eval / innerHTML");
[
  { label: "dangerouslySetInnerHTML", pattern: /dangerouslySetInnerHTML/g },
  { label: "eval(", pattern: /\beval\s*\(/g },
  { label: "innerHTML =", pattern: /\.innerHTML\s*=/g },
  { label: "document.write(", pattern: /document\.write\s*\(/g },
].forEach(({ label, pattern }) => {
  const hits = grepSource(pattern);
  if (hits.length) warn(`${label} found in: ${hits.join(", ")}`, "Ensure input is sanitised before use (use DOMPurify or avoid entirely).");
  else ok(`No ${label} usage found`);
});

// ─── 10. HTTP headers (live URL) ─────────────────────────────────────────────

if (LIVE_URL) {
  section(`10. HTTP security headers — ${LIVE_URL}`);
  info("Fetching headers (following redirects)...");

  const { chain, final } = await fetchFollowRedirects(LIVE_URL);

  // Check HTTP → HTTPS redirect
  if (LIVE_URL.startsWith("http://")) {
    const first = chain[0];
    if (first && [301, 302, 307, 308].includes(first.status) && first.headers.location?.startsWith("https://"))
      ok("HTTP → HTTPS redirect active");
    else
      fail("HTTP → HTTPS redirect NOT detected", "Enable in Vercel: Settings → Domains → Force HTTPS.");
  }

  if (!final) {
    fail("Could not fetch live URL headers", "Check the URL is correct and the site is reachable.");
  } else {
    const h = final.headers;
    const checks = [
      {
        header: "strict-transport-security",
        label: "HSTS",
        test: (v) => !!v,
        hint: "Add to vercel.json headers: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
      {
        header: "content-security-policy",
        label: "Content-Security-Policy",
        test: (v) => !!v,
        hint: "Add a CSP header in vercel.json. Start with: default-src 'self'",
        severity: "fail",
      },
      {
        header: "x-frame-options",
        label: "X-Frame-Options",
        test: (v) => !!v && ["DENY", "SAMEORIGIN"].includes(v.toUpperCase()),
        hint: "Add: X-Frame-Options: DENY",
      },
      {
        header: "x-content-type-options",
        label: "X-Content-Type-Options",
        test: (v) => v === "nosniff",
        hint: "Add: X-Content-Type-Options: nosniff",
      },
      {
        header: "referrer-policy",
        label: "Referrer-Policy",
        test: (v) => !!v,
        hint: "Add: Referrer-Policy: strict-origin-when-cross-origin",
      },
      {
        header: "permissions-policy",
        label: "Permissions-Policy",
        test: (v) => !!v,
        hint: "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
        severity: "warn",
      },
      {
        header: "x-powered-by",
        label: "X-Powered-By hidden",
        test: (v) => !v,
        hint: "Add to vercel.json: { key: 'X-Powered-By', value: '' } or use Next.js poweredByHeader: false",
        severity: "warn",
        invert: true,
      },
    ];

    checks.forEach(({ header, label, test, hint, severity = "fail", invert }) => {
      const val = h[header];
      const pass = invert ? !val : test(val);
      if (pass) ok(`${label}: ${invert ? "not exposed" : val || "set"}`);
      else if (severity === "warn") warn(`${label} missing or misconfigured`, hint);
      else fail(`${label} missing or misconfigured`, hint);
    });

    // CSP detail check
    const csp = h["content-security-policy"];
    if (csp) {
      if (/unsafe-inline/i.test(csp)) warn("CSP contains 'unsafe-inline'", "Replace with nonces or hashes where possible.");
      else ok("CSP does not use unsafe-inline");
      if (/unsafe-eval/i.test(csp)) warn("CSP contains 'unsafe-eval'", "Remove unless absolutely required.");
      else ok("CSP does not use unsafe-eval");
    }

    // CORS check
    const cors = h["access-control-allow-origin"];
    if (cors === "*") fail("CORS is set to wildcard '*'", "Restrict to your domain: Access-Control-Allow-Origin: https://yourdomain.com");
    else if (cors) ok(`CORS restricted to: ${cors}`);
    else ok("No wildcard CORS detected");

    // Server header
    const server = h["server"];
    if (server) warn(`Server header reveals: "${server}"`, "Consider hiding server info to reduce fingerprinting.");
    else ok("Server header not exposed");

    info(`Final response status: ${final.status}`);
    if (chain.length > 1) info(`Redirect chain: ${chain.map((c) => `${c.status} ${c.url}`).join(" → ")}`);
  }

  // HTTPS check
  section(`11. HTTPS & certificate`);
  if (LIVE_URL.startsWith("https://")) {
    ok("URL uses HTTPS");
    // Try to detect cert expiry via a TLS connection
    const urlObj = new URL(LIVE_URL);
    const certInfo = await new Promise((resolve) => {
      const req = https.get({ host: urlObj.hostname, port: 443, path: "/", method: "HEAD", timeout: 5000 }, (res) => {
        const cert = res.socket.getPeerCertificate();
        resolve(cert);
        res.resume();
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => { req.destroy(); resolve(null); });
    });
    if (certInfo?.valid_to) {
      const expiry = new Date(certInfo.valid_to);
      const daysLeft = Math.floor((expiry - Date.now()) / 86400000);
      if (daysLeft < 0) fail(`SSL certificate has EXPIRED!`, "Renew immediately.");
      else if (daysLeft < 14) fail(`SSL certificate expires in ${daysLeft} days`, "Renew now.");
      else if (daysLeft < 30) warn(`SSL certificate expires in ${daysLeft} days`, "Renew soon.");
      else ok(`SSL certificate valid for ${daysLeft} more days (expires ${expiry.toDateString()})`);
      if (certInfo.issuer?.O) info(`Issuer: ${certInfo.issuer.O}`);
    } else {
      info("Could not retrieve certificate expiry info.");
    }
  } else {
    fail("URL does not use HTTPS!", "Enable HTTPS in Vercel.");
  }
} else {
  section("10–11. HTTP headers & HTTPS");
  warn("No live URL provided — skipping header checks.", "Rerun with: node security-audit.js https://yoursite.com");
}

// ─── 12. vercel.json headers check ───────────────────────────────────────────

section("12. vercel.json security headers config");
const vercelJson = readFile("vercel.json");
if (!vercelJson) {
  warn("vercel.json not found", "Create one to configure security headers.");
} else {
  try {
    const vj = JSON.parse(vercelJson);
    const headers = vj.headers || [];
    const allHeaderValues = headers.flatMap((h) => h.headers || []).map((h) => h.key?.toLowerCase());
    const required = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"];
    required.forEach((h) => {
      if (allHeaderValues.includes(h)) ok(`vercel.json: ${h} configured`);
      else warn(`vercel.json: ${h} not configured`, `Add it under the "headers" array.`);
    });
  } catch {
    warn("Could not parse vercel.json", "Check for JSON syntax errors.");
  }
}

// ─── 13. next.config.js security settings ────────────────────────────────────

section("13. next.config.js / next.config.mjs security");
const nextConfig = readFile("next.config.js") || readFile("next.config.mjs") || readFile("next.config.ts");
if (!nextConfig) {
  info("next.config not found (may be default).");
} else {
  if (/poweredByHeader\s*:\s*false/.test(nextConfig)) ok("poweredByHeader: false — X-Powered-By hidden");
  else warn("poweredByHeader not set to false", "Add: poweredByHeader: false to next.config.js");
  if (/reactStrictMode\s*:\s*true/.test(nextConfig)) ok("reactStrictMode: true");
  else warn("reactStrictMode not enabled", "Add: reactStrictMode: true");
  if (/headers\s*\(\s*\)/.test(nextConfig)) ok("Custom headers function found in next.config");
}

// ─── 14. Auth patterns ────────────────────────────────────────────────────────

section("14. Auth & session patterns");
const localStorageAuth = grepSource(/localStorage\.(setItem|getItem).*token|localStorage\.(setItem|getItem).*jwt/i);
if (localStorageAuth.length > 0)
  warn(`JWT/token in localStorage found in: ${localStorageAuth.join(", ")}`, "Prefer httpOnly cookies or Supabase session (which uses its own secure storage).");
else ok("No JWT stored in localStorage detected");

const evalAuth = grepSource(/jwt_decode\s*\(|atob\s*\(.*token/i);
if (evalAuth.length > 0) info(`Manual JWT decode found in: ${evalAuth.join(", ")} — ensure you're validating server-side too.`);

// ─── 15. Rate limiting hints ──────────────────────────────────────────────────

section("15. Rate limiting");
const rateLimit = grepSource(/rateLimit|rate.limit|upstash|express-rate-limit|@vercel\/kv/i);
if (rateLimit.length > 0) ok(`Rate limiting code found in: ${rateLimit.join(", ")}`);
else warn("No rate limiting code detected", "Add rate limiting to /api/auth/* and payment endpoints. Use Upstash Redis + @upstash/ratelimit on Vercel.");

// ─── 16. File upload security ─────────────────────────────────────────────────

section("16. File upload security");
const uploads = grepSource(/multer|formidable|busboy|file\.type|file\.size|mimetype/i);
if (uploads.length > 0) {
  ok(`File handling code found in: ${uploads.join(", ")}`);
  const sizeCheck = grepSource(/maxSize|maxFileSize|file\.size/i);
  if (sizeCheck.length === 0) warn("No file size check detected in upload code", "Always limit: maxSize and validate MIME type server-side.");
  else ok("File size check found");
} else {
  info("No file upload handling detected.");
}

// ─── 17. Console.log sensitive data ──────────────────────────────────────────

section("17. console.log of sensitive data");
const consoleLogs = grepSource(/console\.log\s*\(.*(?:password|token|secret|key|auth|jwt)/gi);
if (consoleLogs.length > 0) warn(`Possible sensitive data in console.log: ${consoleLogs.join(", ")}`, "Remove before production.");
else ok("No obvious sensitive data in console.log calls");

// ─── 18. Payment integration readiness ───────────────────────────────────────

section("18. Payment integration readiness");
const stripeFiles = grepSource(/stripe|payment/i);
if (stripeFiles.length > 0) {
  info(`Stripe/payment code found in: ${stripeFiles.join(", ")}`);
  const stripeSecretFrontend = grepSource(/sk_live_|sk_test_/);
  if (stripeSecretFrontend.length > 0)
    fail(`Stripe secret key in source: ${stripeSecretFrontend.join(", ")}`, "Move to env vars — NEVER expose sk_live_ or sk_test_ in frontend.");
  else ok("No Stripe secret key hardcoded in source");
  const webhookVerify = grepSource(/constructEvent|stripe\.webhooks|webhook.*secret/i);
  if (webhookVerify.length > 0) ok("Stripe webhook signature verification code found");
  else warn("No Stripe webhook verification found", "Add: stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)");
} else {
  info("No payment integration found yet — checklist ready for when you add it.");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`${BOLD}SECURITY AUDIT SUMMARY${RESET}`);
console.log(`${"═".repeat(60)}`);
console.log(`  ${GREEN}Passed:${RESET}  ${passed}`);
console.log(`  ${RED}Failed:${RESET}  ${failed}`);
console.log(`  ${YELLOW}Warnings:${RESET} ${warned}`);

const score = Math.round((passed / (passed + failed + warned)) * 100);
const scoreColor = score >= 80 ? GREEN : score >= 60 ? YELLOW : RED;
console.log(`\n  Security score: ${scoreColor}${BOLD}${score}%${RESET}`);

if (issues.length > 0) {
  console.log(`\n${BOLD}Action items:${RESET}`);
  issues
    .filter((i) => i.level === "FAIL")
    .forEach((i) => console.log(`  ${RED}✗${RESET} [CRITICAL] ${i.msg}${i.hint ? `\n      → ${DIM}${i.hint}${RESET}` : ""}`));
  issues
    .filter((i) => i.level === "WARN")
    .forEach((i) => console.log(`  ${YELLOW}⚠${RESET} [WARN]     ${i.msg}${i.hint ? `\n      → ${DIM}${i.hint}${RESET}` : ""}`));
}

console.log(`\n${DIM}Tip: Fix all CRITICAL items before adding payment integration.${RESET}`);
if (!LIVE_URL) console.log(`${DIM}Tip: Rerun with your URL for full header analysis: node security-audit.js https://yoursite.com${RESET}`);
console.log();