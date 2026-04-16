import { relations } from "drizzle-orm/relations";
import { users, entitlements, files, profiles, bookings, availability } from "./schema";

export const entitlementsRelations = relations(entitlements, ({one}) => ({
	user: one(users, {
		fields: [entitlements.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	entitlements: many(entitlements),
	files: many(files),
	profiles: many(profiles),
	bookings: many(bookings),
	availabilities: many(availability),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.userId],
		references: [users.id]
	}),
	profile: one(profiles, {
		fields: [files.profileId],
		references: [profiles.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	files: many(files),
	user: one(users, {
		fields: [profiles.userId],
		references: [users.id]
	}),
	bookings: many(bookings),
	availabilities: many(availability),
}));

export const bookingsRelations = relations(bookings, ({one}) => ({
	profile: one(profiles, {
		fields: [bookings.profileId],
		references: [profiles.id]
	}),
	user: one(users, {
		fields: [bookings.ownerId],
		references: [users.id]
	}),
}));

export const availabilityRelations = relations(availability, ({one}) => ({
	profile: one(profiles, {
		fields: [availability.profileId],
		references: [profiles.id]
	}),
	user: one(users, {
		fields: [availability.userId],
		references: [users.id]
	}),
}));