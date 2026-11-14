CREATE TABLE "case_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_checkout_session_id" text,
	"plan" text,
	"status" text NOT NULL,
	"livemode" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "entitlements_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"session_id" text,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"kind" text NOT NULL,
	"send_on" date NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"attempts" numeric DEFAULT '0' NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("status","send_on");