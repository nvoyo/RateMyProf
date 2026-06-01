import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ---- Enums ----
export const userRoleEnum = pgEnum('user_role', ['student', 'admin'])
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled'])
export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'revoked',
])
export const reviewStatusEnum = pgEnum('review_status', [
  'pending',
  'approved',
  'rejected',
])

// ---- Schools ----
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  // Reserved for future email-domain based verification.
  domain: text('domain'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---- Users ----
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: userRoleEnum('role').notNull().default('student'),
  status: userStatusEnum('status').notNull().default('active'),
  schoolId: uuid('school_id').references(() => schools.id, {
    onDelete: 'set null',
  }),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---- Invites (whitelist) ----
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  invitedBy: uuid('invited_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---- Professors ----
export const professors = pgTable('professors', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  department: text('department').notNull(),
  title: text('title'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---- Reviews ----
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    professorId: uuid('professor_id')
      .notNull()
      .references(() => professors.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseCode: text('course_code'),
    qualityRating: smallint('quality_rating').notNull(),
    difficultyRating: smallint('difficulty_rating').notNull(),
    wouldTakeAgain: boolean('would_take_again').notNull().default(false),
    grade: text('grade'),
    comment: text('comment').notNull(),
    status: reviewStatusEnum('status').notNull().default('pending'),
    moderatedBy: uuid('moderated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    // Soft-delete: a student can request deletion; an admin confirms it.
    // While requested, the review is hidden from the public listing.
    deletionRequested: boolean('deletion_requested').notNull().default(false),
    deletionRequestedAt: timestamp('deletion_requested_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // A user may only review a given professor once (edit instead of re-adding).
    reviewAuthorUnique: uniqueIndex('review_author_unique').on(
      table.professorId,
      table.authorId,
    ),
  }),
)

// ---- Review tags (many-to-many flattened) ----
export const reviewTags = pgTable(
  'review_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (table) => ({
    reviewTagUnique: uniqueIndex('review_tag_unique').on(
      table.reviewId,
      table.tag,
    ),
  }),
)

// ---- Votes (helpfulness) ----
export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(), // +1 or -1
  },
  (table) => ({
    voteUnique: uniqueIndex('vote_unique').on(table.reviewId, table.userId),
  }),
)

// ---- Relations ----
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  professors: many(professors),
  invites: many(invites),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  reviews: many(reviews),
}))

export const professorsRelations = relations(professors, ({ one, many }) => ({
  school: one(schools, {
    fields: [professors.schoolId],
    references: [schools.id],
  }),
  reviews: many(reviews),
}))

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  professor: one(professors, {
    fields: [reviews.professorId],
    references: [professors.id],
  }),
  author: one(users, {
    fields: [reviews.authorId],
    references: [users.id],
  }),
  tags: many(reviewTags),
  votes: many(votes),
}))

export const reviewTagsRelations = relations(reviewTags, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewTags.reviewId],
    references: [reviews.id],
  }),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  review: one(reviews, {
    fields: [votes.reviewId],
    references: [reviews.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}))

// ---- Inferred types ----
export type School = typeof schools.$inferSelect
export type User = typeof users.$inferSelect
export type Invite = typeof invites.$inferSelect
export type Professor = typeof professors.$inferSelect
export type Review = typeof reviews.$inferSelect
export type ReviewTag = typeof reviewTags.$inferSelect
export type Vote = typeof votes.$inferSelect
