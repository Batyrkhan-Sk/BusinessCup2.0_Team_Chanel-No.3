/** SERVER-ONLY. Which integrations are configured. Never exposes secret values. */
export type Integration = "anthropic" | "stripe" | "resend" | "database" | "cron";

const REQUIRED: Record<Integration, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_YEARLY"],
  resend: ["RESEND_API_KEY", "RESEND_FROM"],
  database: ["DATABASE_URL"],
  cron: ["CRON_SECRET"],
};

export function missingEnv(i: Integration, env: NodeJS.ProcessEnv = process.env): string[] {
  return REQUIRED[i].filter((k) => !env[k]);
}

export function isConfigured(i: Integration, env: NodeJS.ProcessEnv = process.env): boolean {
  return missingEnv(i, env).length === 0;
}

export function integrationStatus(env: NodeJS.ProcessEnv = process.env) {
  return (Object.keys(REQUIRED) as Integration[]).map((i) => ({ integration: i, configured: isConfigured(i, env), missing: missingEnv(i, env) }));
}

export function appUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.NEXT_PUBLIC_APP_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
}

/** Standard JSON body for a 503 "not configured" response. */
export function notConfigured(i: Integration) {
  return { error: "not_configured", integration: i, missing: missingEnv(i), message: `${i} is not configured on this deployment (missing: ${missingEnv(i).join(", ")}). Nothing was faked.` };
}
