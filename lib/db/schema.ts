import { boolean, date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Scheduled reminder emails (sent by the Vercel Cron job). Email is the only personal data stored. */
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    kind: text("kind").notNull(),
    send_on: date("send_on").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("scheduled"), // scheduled | sent | failed | cancelled
    attempts: numeric("attempts").notNull().default("0"),
    last_error: text("last_error"),
    sent_at: timestamp("sent_at", { withTimezone: true }),
    unsubscribe_token: uuid("unsubscribe_token").notNull().defaultRandom(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reminders_due_idx").on(t.status, t.send_on)],
);

/** A user's case snapshot (quiz answers + decoded denial facts), stored only when they set reminders. */
export const caseSnapshots = pgTable("case_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Guardian subscriptions, written by the Stripe webhook. */
export const entitlements = pgTable("entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id").unique(),
  stripe_checkout_session_id: text("stripe_checkout_session_id").unique(),
  plan: text("plan"),
  status: text("status").notNull(),
  livemode: boolean("livemode").notNull().default(false),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Product analytics events (quiz_start, result_view, paywall_view, checkout_start, reminder_set). */
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  session_id: text("session_id"),
  props: jsonb("props").notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
