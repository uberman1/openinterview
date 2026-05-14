CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"profile_id" varchar(255),
	"user_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"timezone" varchar(100) DEFAULT 'America/Los_Angeles' NOT NULL,
	"window_days" integer DEFAULT 60 NOT NULL,
	"duration_minutes" integer DEFAULT 7 NOT NULL,
	"slots" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "availability_profile_id_key" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"profile_id" varchar(255) NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"booker_name" varchar(255),
	"booker_email" varchar(255),
	"message" text,
	"scheduled_date" date,
	"scheduled_time" time,
	"duration" integer DEFAULT 30,
	"start_time" timestamp with time zone,
	"status" varchar(50) DEFAULT 'confirmed',
	"ics_content" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"recruiter_timezone" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"plan" varchar(50) DEFAULT 'free',
	"shares_used" integer DEFAULT 0,
	"shares_limit" integer DEFAULT 1,
	"bookings_used" integer DEFAULT 0,
	"bookings_limit" integer DEFAULT 0,
	"credits_reset_at" timestamp,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_subscription_status" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"views_used" bigint DEFAULT 0 NOT NULL,
	"video_storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"doc_storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "entitlements_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"mime" varchar(255),
	"size_label" varchar(50),
	"url" text,
	"kind" varchar(32) DEFAULT 'attachment' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"profile_id" varchar(255),
	"public_id" varchar(255),
	"size_bytes" bigint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"code" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"interval" varchar(20) DEFAULT 'month' NOT NULL,
	"shares_limit" integer,
	"bookings_limit" integer,
	"stripe_price_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"max_interview_length_seconds" integer DEFAULT 420 NOT NULL,
	"views_limit" bigint,
	"video_storage_limit_bytes" bigint,
	"doc_storage_limit_bytes" bigint,
	"max_resume_file_size_bytes" bigint DEFAULT 5242880 NOT NULL,
	CONSTRAINT "plans_stripe_price_id_key" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"profile_name" varchar(255),
	"title" varchar(255),
	"city" varchar(255),
	"location" varchar(255),
	"about" text,
	"summary" text,
	"video_url" text,
	"video_file_id" varchar(255),
	"resume_file_id" varchar(255),
	"public_handle" varchar(255),
	"visibility" varchar(50) DEFAULT 'private',
	"is_default" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"booking_count" integer DEFAULT 0,
	"person" jsonb DEFAULT '{}'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"social" jsonb DEFAULT '{}'::jsonb,
	"contact" jsonb DEFAULT '{}'::jsonb,
	"experience" jsonb DEFAULT '[]'::jsonb,
	"education" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"avatar_url" text,
	"thumbnail_url" text,
	"thumbnail_file_id" text,
	CONSTRAINT "profiles_public_handle_key" UNIQUE("public_handle")
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"event_id" varchar(255) PRIMARY KEY NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"processed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"password_hash" varchar(255),
	"google_id" varchar(255),
	"avatar" text,
	"timezone" varchar(100) DEFAULT 'America/Los_Angeles',
	"role" varchar(50) DEFAULT 'user',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(20) DEFAULT 'anonymous',
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_google_id_key" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "fk_files_profile" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_profile_id" ON "analytics_events" USING btree ("profile_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_availability_user_id" ON "availability" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_owner_id" ON "bookings" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_profile_id" ON "bookings" USING btree ("profile_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_booking_profile_start_active" ON "bookings" USING btree ("profile_id","start_time") WHERE status IN ('pending', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_entitlements_user_id" ON "entitlements" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_files_user_id" ON "files" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_public_handle" ON "profiles" USING btree ("public_handle" text_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_user_id" ON "profiles" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status" text_ops);