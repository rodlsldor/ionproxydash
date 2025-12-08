CREATE TYPE "public"."allocation_status" AS ENUM('active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."billing_payment_method" AS ENUM('wallet', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."billing_status" AS ENUM('pending', 'paid', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."funds_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TYPE "public"."proxy_status" AS ENUM('available', 'allocated', 'maintenance', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'incomplete', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(50),
	"scope" text,
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"invoice_number" varchar(100) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "billing_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "billing_payment_method" DEFAULT 'stripe' NOT NULL,
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"payment_provider" "payment_provider",
	"payment_reference" varchar(255),
	"wallet_funds_id" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"status" "funds_status" DEFAULT 'pending' NOT NULL,
	"payment_provider" "payment_provider",
	"transaction_reference" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"level" varchar(20) DEFAULT 'kyc1',
	"document_type" varchar(50),
	"document_country" varchar(2),
	"document_last_four" varchar(10),
	"document_expiry_date" timestamp,
	"date_of_birth" timestamp,
	"provider" varchar(50),
	"provider_session_id" varchar(255),
	"provider_verification_id" varchar(255),
	"provider_result_code" varchar(100),
	"risk_score" numeric(5, 2),
	"selfie_match" boolean,
	"manual_review_required" boolean DEFAULT false NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"verified_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "proxies" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(100),
	"ip_address" varchar(45) NOT NULL,
	"port" integer NOT NULL,
	"username" varchar(100),
	"password" varchar(100),
	"location" varchar(100),
	"isp" varchar(100),
	"status" "proxy_status" DEFAULT 'available' NOT NULL,
	"last_health_check" timestamp with time zone,
	"dongle_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "proxy_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"proxy_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"status" "allocation_status" DEFAULT 'active' NOT NULL,
	"price_monthly" numeric(12, 2) NOT NULL,
	"subscription_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proxy_usage_samples" (
	"id" serial PRIMARY KEY NOT NULL,
	"proxy_id" integer NOT NULL,
	"allocation_id" integer,
	"user_id" integer NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"bytes_in" bigint NOT NULL,
	"bytes_out" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"payment_method" "billing_payment_method" DEFAULT 'stripe' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"amount_monthly" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"category" varchar(50),
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
	"admin_reply" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"closed_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" varchar(100),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(30),
	"country_residence" varchar(2),
	"language" varchar(30) DEFAULT 'en',
	"timezone" varchar(50),
	"avatar_url" varchar(512),
	"email_verified" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"stripe_customer_id" varchar(255),
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"account_locked_until" timestamp with time zone,
	"password_updated_at" timestamp with time zone,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_type" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_wallet_funds_id_funds_id_fk" FOREIGN KEY ("wallet_funds_id") REFERENCES "public"."funds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funds" ADD CONSTRAINT "funds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_allocations" ADD CONSTRAINT "proxy_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_allocations" ADD CONSTRAINT "proxy_allocations_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_allocations" ADD CONSTRAINT "proxy_allocations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_usage_samples" ADD CONSTRAINT "proxy_usage_samples_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_usage_samples" ADD CONSTRAINT "proxy_usage_samples_allocation_id_proxy_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."proxy_allocations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_usage_samples" ADD CONSTRAINT "proxy_usage_samples_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_deleted_at_idx" ON "billing" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "billing_user_id_idx" ON "billing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_subscription_id_idx" ON "billing" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_status_idx" ON "billing" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_user_unique" ON "billing" USING btree ("user_id","invoice_number");--> statement-breakpoint
CREATE INDEX "funds_deleted_at_idx" ON "funds" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "identity_verifications_user_status_idx" ON "identity_verifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "proxies_ip_port_unique" ON "proxies" USING btree ("ip_address","port");--> statement-breakpoint
CREATE INDEX "proxies_deleted_at_idx" ON "proxies" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");