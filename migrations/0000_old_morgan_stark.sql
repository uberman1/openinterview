CREATE TABLE "assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"storage_url" text,
	"file_size" text,
	"mime_type" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"owner_user_id" varchar NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[]
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"billing" jsonb,
	"entitlement" jsonb
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"response_time" text,
	"environment" text,
	"adapters" jsonb,
	"flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"profile_name" text,
	"person" jsonb,
	"title" text,
	"location" text,
	"about" text,
	"video" jsonb,
	"resume" jsonb,
	"attachments" jsonb,
	"highlights" jsonb,
	"skills" text[] DEFAULT ARRAY[]::text[],
	"social" jsonb,
	"contact" jsonb,
	"availability_id" varchar,
	"public_handle" varchar,
	"visibility" text DEFAULT 'private',
	"status" text DEFAULT 'draft',
	"share_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" text,
	CONSTRAINT "profiles_public_handle_unique" UNIQUE("public_handle")
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"duration" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"roles" text[] DEFAULT ARRAY['user'],
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;