import { pgTable, index, unique, varchar, text, timestamp, foreignKey, integer, bigint, boolean, jsonb, uniqueIndex, date, time, serial, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	email: varchar({ length: 255 }),
	name: varchar({ length: 255 }),
	passwordHash: varchar("password_hash", { length: 255 }),
	googleId: varchar("google_id", { length: 255 }),
	avatar: text(),
	timezone: varchar({ length: 100 }).default('America/Los_Angeles'),
	role: varchar({ length: 50 }).default('user'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	status: varchar({ length: 20 }).default('anonymous'),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("users_email_key").on(table.email),
	unique("users_google_id_key").on(table.googleId),
]);

export const entitlements = pgTable("entitlements", {
	id: varchar({ length: 255 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	plan: varchar({ length: 50 }).default('free'),
	sharesUsed: integer("shares_used").default(0),
	sharesLimit: integer("shares_limit").default(1),
	bookingsUsed: integer("bookings_used").default(0),
	bookingsLimit: integer("bookings_limit").default(0),
	creditsResetAt: timestamp("credits_reset_at", { mode: 'string' }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripeSubscriptionStatus: varchar("stripe_subscription_status", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	viewsUsed: bigint("views_used", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	videoStorageUsedBytes: bigint("video_storage_used_bytes", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	docStorageUsedBytes: bigint("doc_storage_used_bytes", { mode: "number" }).default(0).notNull(),
}, (table) => [
	index("idx_entitlements_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "entitlements_user_id_fkey"
		}).onDelete("cascade"),
	unique("entitlements_user_id_key").on(table.userId),
]);

export const files = pgTable("files", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	mime: varchar({ length: 255 }),
	sizeLabel: varchar("size_label", { length: 50 }),
	url: text(),
	kind: varchar({ length: 32 }).default('attachment').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	profileId: varchar("profile_id", { length: 255 }),
	publicId: varchar("public_id", { length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }).default(0),
}, (table) => [
	index("idx_files_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "fk_files_profile"
		}).onDelete("cascade"),
]);

export const profiles = pgTable("profiles", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	profileName: varchar("profile_name", { length: 255 }),
	title: varchar({ length: 255 }),
	city: varchar({ length: 255 }),
	location: varchar({ length: 255 }),
	about: text(),
	summary: text(),
	videoUrl: text("video_url"),
	videoFileId: varchar("video_file_id", { length: 255 }),
	resumeFileId: varchar("resume_file_id", { length: 255 }),
	publicHandle: varchar("public_handle", { length: 255 }),
	visibility: varchar({ length: 50 }).default('private'),
	isDefault: boolean("is_default").default(false),
	viewCount: integer("view_count").default(0),
	bookingCount: integer("booking_count").default(0),
	person: jsonb().default({}),
	highlights: jsonb().default([]),
	skills: jsonb().default([]),
	social: jsonb().default({}),
	contact: jsonb().default({}),
	experience: jsonb().default([]),
	education: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	avatarUrl: text("avatar_url"),
	thumbnailUrl: text("thumbnail_url"),
	thumbnailFileId: text("thumbnail_file_id"),
}, (table) => [
	index("idx_profiles_public_handle").using("btree", table.publicHandle.asc().nullsLast().op("text_ops")),
	index("idx_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("profiles_public_handle_key").on(table.publicHandle),
]);

export const bookings = pgTable("bookings", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	profileId: varchar("profile_id", { length: 255 }).notNull(),
	ownerId: varchar("owner_id", { length: 255 }).notNull(),
	bookerName: varchar("booker_name", { length: 255 }),
	bookerEmail: varchar("booker_email", { length: 255 }),
	message: text(),
	scheduledDate: date("scheduled_date"),
	scheduledTime: time("scheduled_time"),
	duration: integer().default(30),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 50 }).default('confirmed'),
	icsContent: text("ics_content"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	recruiterTimezone: varchar("recruiter_timezone", { length: 50 }),
}, (table) => [
	index("idx_bookings_owner_id").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("idx_bookings_profile_id").using("btree", table.profileId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_booking_profile_start_active").on(table.profileId, table.startTime).where(sql`status IN ('pending', 'confirmed')`),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "bookings_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "bookings_owner_id_fkey"
		}).onDelete("cascade"),
]);

export const analyticsEvents = pgTable("analytics_events", {
	id: serial().primaryKey().notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	profileId: varchar("profile_id", { length: 255 }),
	userId: varchar("user_id", { length: 255 }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_analytics_profile_id").using("btree", table.profileId.asc().nullsLast().op("text_ops")),
]);

export const plans = pgTable("plans", {
	code: varchar({ length: 50 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	priceCents: integer("price_cents").default(0).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	interval: varchar({ length: 20 }).default('month').notNull(),
	sharesLimit: integer("shares_limit"),
	bookingsLimit: integer("bookings_limit"),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	maxInterviewLengthSeconds: integer("max_interview_length_seconds").default(420).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	viewsLimit: bigint("views_limit", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	videoStorageLimitBytes: bigint("video_storage_limit_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	docStorageLimitBytes: bigint("doc_storage_limit_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	maxResumeFileSizeBytes: bigint("max_resume_file_size_bytes", { mode: "number" }).default(5242880).notNull(),
}, (table) => [
	unique("plans_stripe_price_id_key").on(table.stripePriceId),
]);

export const availability = pgTable("availability", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	profileId: varchar("profile_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	timezone: varchar({ length: 100 }).default('America/Los_Angeles').notNull(),
	windowDays: integer("window_days").default(60).notNull(),
	durationMinutes: integer("duration_minutes").default(7).notNull(),
	slots: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_availability_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "availability_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "availability_user_id_fkey"
		}).onDelete("cascade"),
	unique("availability_profile_id_key").on(table.profileId),
]);

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
	eventId: varchar("event_id", { length: 255 }).primaryKey().notNull(),
	eventType: varchar("event_type", { length: 255 }).notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
