import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  roles: text("roles").array().default(sql`ARRAY['user']`),
});

export const healthChecks = pgTable("health_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull(),
  responseTime: text("response_time"),
  environment: text("environment"),
  adapters: jsonb("adapters"),
  flags: jsonb("flags"),
});

export const logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: text("level").notNull(),
  source: text("source").notNull(),
  message: text("message").notNull(),
});

export const testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  duration: text("duration"),
  details: jsonb("details"),
});

// Assets table for resumes and attachments
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'resume' or 'attachment'
  name: text("name").notNull(),
  storageUrl: text("storage_url"), // URL to file in object storage
  fileSize: text("file_size"), // file size in bytes
  mimeType: text("mime_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  ownerUserId: varchar("owner_user_id").notNull(), // 'me' for now, user ID in future
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
});

export const profiles = pgTable("profiles", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: varchar("owner_id").notNull().references(() => users.id),
    profileName: text("profile_name"),
    person: jsonb("person"),
    title: text("title"),
    location: text("location"),
    about: text("about"),
    video: jsonb("video"),
    resume: jsonb("resume"),
    attachments: jsonb("attachments"),
    highlights: jsonb("highlights"),
    skills: text("skills").array().default(sql`ARRAY[]::text[]`),
    social: jsonb("social"),
    contact: jsonb("contact"),
    availabilityId: varchar("availability_id"),
    publicHandle: varchar("public_handle").unique(),
    visibility: text("visibility").default("private"),
    status: text("status").default("draft"),
    shareCount: integer("share_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    version: text("version"),
});

export const entitlements = pgTable("entitlements", {
    userId: varchar("user_id").primaryKey().references(() => users.id),
    billing: jsonb("billing"),
    entitlement: jsonb("entitlement"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertHealthCheckSchema = createInsertSchema(healthChecks).omit({
  id: true,
  timestamp: true,
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  timestamp: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  uploadedAt: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertEntitlementSchema = createInsertSchema(entitlements);


export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthCheck = typeof healthChecks.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type TestResult = typeof testResults.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type InsertHealthCheck = z.infer<typeof insertHealthCheckSchema>;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertEntitlement = z.infer<typeof insertEntitlementSchema>;
