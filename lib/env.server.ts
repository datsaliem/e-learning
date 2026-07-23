import "server-only";

function requireServerEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing required server environment variable: ${names.join(" or ")}`);
}

/** Never import these getters from Client Components. */
export const serverEnv = {
  get paymentProvider() {
    return (process.env.PAYMENT_PROVIDER?.trim().toLowerCase() || "stripe") as "stripe";
  },
  get stripeSecretKey() {
    return requireServerEnv(["STRIPE_SECRET_KEY"]);
  },
  get stripeWebhookSecret() {
    return requireServerEnv(["STRIPE_WEBHOOK_SECRET"]);
  },
  get supabaseSecretKey() {
    return requireServerEnv(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  },
};
