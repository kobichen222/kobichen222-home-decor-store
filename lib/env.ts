// Central access to environment variables. Public values are safe for the
// browser; everything read through serverEnv() must stay on the server.

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)");
  }
  return { supabaseUrl: url, supabaseKey: key };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export const serverEnv = {
  // SHOP_SUPABASE_SECRET_KEY: the name used when the Vercel integration adds a prefix.
  supabaseSecretKey: () => process.env.SUPABASE_SECRET_KEY || process.env.SHOP_SUPABASE_SECRET_KEY || required("SUPABASE_SECRET_KEY"),
  paymentProvider: () => process.env.PAYMENT_PROVIDER ?? "",
  paymentWebhookSecret: () => required("PAYMENT_WEBHOOK_SECRET"),
  cronSecret: () => required("CRON_SECRET"),
};
