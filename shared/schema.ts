import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthCheck = typeof healthChecks.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type TestResult = typeof testResults.$inferSelect;
export type InsertHealthCheck = z.infer<typeof insertHealthCheckSchema>;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
