#!/usr/bin/env node

const errors = [];
const warnings = [];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function addError(name, message) {
  errors.push(`${name}: ${message}`);
}

function addWarning(name, message) {
  warnings.push(`${name}: ${message}`);
}

function parseUrl(name, { https = false, local = false } = {}) {
  const raw = value(name);
  if (!raw) {
    addError(name, "missing");
    return null;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    addError(name, "must be a valid absolute URL");
    return null;
  }

  if (https && parsed.protocol !== "https:") {
    addError(name, "must use HTTPS in production");
  }

  if (!local && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    addError(name, "must not point to localhost in production");
  }

  if (/your-|example\.(com|org)|placeholder/i.test(raw)) {
    addError(name, "still contains a placeholder");
  }

  return parsed;
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function checkPublicKey() {
  const name = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  const key = value(name);
  if (!key) return addError(name, "missing");
  if (/your-|placeholder/i.test(key)) return addError(name, "still contains a placeholder");
  if (key.startsWith("sb_publishable_")) return;

  const payload = decodeJwtPayload(key);
  if (payload?.role !== "anon") {
    addError(name, "must be an sb_publishable_* key or a legacy JWT with role=anon");
  }
}

function checkSupabaseServerKey() {
  const modern = value("SUPABASE_SECRET_KEY");
  const legacy = value("SUPABASE_SERVICE_ROLE_KEY");

  if (!modern && !legacy) {
    addError("SUPABASE_SECRET_KEY", "missing (legacy SUPABASE_SERVICE_ROLE_KEY is also accepted)");
    return;
  }

  if (modern && !modern.startsWith("sb_secret_")) {
    addError("SUPABASE_SECRET_KEY", "unexpected format; expected sb_secret_*");
  }

  if (legacy) {
    const payload = decodeJwtPayload(legacy);
    if (payload?.role !== "service_role") {
      addError("SUPABASE_SERVICE_ROLE_KEY", "legacy JWT must have role=service_role");
    }
  }
}

function checkStripe() {
  const provider = value("PAYMENT_PROVIDER") || "stripe";
  if (provider !== "stripe") {
    addError("PAYMENT_PROVIDER", "only stripe is supported");
    return;
  }

  const secret = value("STRIPE_SECRET_KEY");
  if (!/^sk_(?:live|test)_[A-Za-z0-9]+/.test(secret)) {
    addError("STRIPE_SECRET_KEY", "missing or unexpected format");
  } else if (secret.startsWith("sk_test_")) {
    addWarning(
      "STRIPE_SECRET_KEY",
      "test mode is enabled; use sk_live_* before accepting real money",
    );
  }

  if (!/^whsec_[A-Za-z0-9]+/.test(value("STRIPE_WEBHOOK_SECRET"))) {
    addError("STRIPE_WEBHOOK_SECRET", "missing or unexpected format");
  }
}

function checkNoSecretIsPublic() {
  for (const [name, raw] of Object.entries(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_") || !raw) continue;
    const jwt = decodeJwtPayload(raw);
    const looksSecret =
      /^(?:sk_(?:live|test)|rk_(?:live|test)|whsec_|re_|sb_secret_)/.test(raw) ||
      jwt?.role === "service_role";
    if (looksSecret) addError(name, "contains a server secret and would be exposed to browsers");
  }
}

const appUrl = parseUrl("NEXT_PUBLIC_APP_URL", { https: true });
const deploymentHost = value("VERCEL_URL");
const productionHost = value("VERCEL_PROJECT_PRODUCTION_URL");
if (
  appUrl &&
  deploymentHost &&
  productionHost &&
  appUrl.hostname === deploymentHost &&
  appUrl.hostname !== productionHost
) {
  addWarning("NEXT_PUBLIC_APP_URL", "uses an immutable deployment URL instead of a stable alias");
}

const supabaseUrl = parseUrl("NEXT_PUBLIC_SUPABASE_URL", { https: true });
if (supabaseUrl && !/\.supabase\.co$/i.test(supabaseUrl.hostname)) {
  addError("NEXT_PUBLIC_SUPABASE_URL", "must point to the linked Supabase project");
}

checkPublicKey();
checkSupabaseServerKey();
checkStripe();
checkNoSecretIsPublic();

for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length > 0) {
  console.error(`Production environment check failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(
  `Production environment check passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`,
);
