import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth Tokens table
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderUnique: uniqueIndex('oauth_user_provider_idx').on(table.userId, table.provider),
}));

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('New Chat').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata').default({}).notNull(),
});

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  version: varchar('version', { length: 50 }).default('1.0.0').notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  content: jsonb('content').default({}).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Document Sections table
export const documentSections = pgTable('document_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  sectionType: varchar('section_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }),
  position: integer('position').notNull(),
  directives: jsonb('directives').default({}).notNull(), // Template directives for this section
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('sections_document_idx').on(table.documentId),
}));

// Document Blocks table
export const documentBlocks = pgTable('document_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id').references(() => documentSections.id, { onDelete: 'cascade' }).notNull(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  blockType: varchar('block_type', { length: 50 }).notNull(),
  position: integer('position').notNull(),
  content: jsonb('content').notNull(),
  directives: jsonb('directives').default({}).notNull(), // Template directives for this block
  entities: jsonb('entities').default([]).notNull(),
  relationships: jsonb('relationships').default([]).notNull(),
  wordCount: integer('word_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 50 }),
  updatedBy: varchar('updated_by', { length: 50 }),
}, (table) => ({
  documentIdx: index('blocks_document_idx').on(table.documentId),
  sectionIdx: index('blocks_section_idx').on(table.sectionId),
}));

// Block Locks table
export const blockLocks = pgTable('block_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockId: uuid('block_id').references(() => documentBlocks.id, { onDelete: 'cascade' }).notNull().unique(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  lockedBy: varchar('locked_by', { length: 100 }).notNull(),
  lockType: varchar('lock_type', { length: 20 }).default('exclusive').notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  documentIdx: index('locks_document_idx').on(table.documentId),
  expiresIdx: index('locks_expires_idx').on(table.expiresAt),
}));

// Chat Messages table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  documentId: uuid('document_id').references(() => documents.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  documentContext: jsonb('document_context'),
  documentReferences: jsonb('document_references').default([]).notNull(),
  pipelineResults: jsonb('pipeline_results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('chat_session_idx').on(table.sessionId),
  documentIdx: index('chat_document_idx').on(table.documentId),
}));

// Edit Operations table
export const editOperations = pgTable('edit_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  blockId: uuid('block_id').references(() => documentBlocks.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id),
  operationType: varchar('operation_type', { length: 20 }).notNull(),
  previousContent: jsonb('previous_content'),
  newContent: jsonb('new_content'),
  authoredBy: varchar('authored_by', { length: 100 }).notNull(),
  chatMessageId: uuid('chat_message_id').references(() => chatMessages.id),
  undone: boolean('undone').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  documents: many(documents),
  oauthTokens: many(oauthTokens),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
  blockLocks: many(blockLocks),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  sections: many(documentSections),
  blocks: many(documentBlocks),
  messages: many(chatMessages),
}));

export const documentSectionsRelations = relations(documentSections, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentSections.documentId],
    references: [documents.id],
  }),
  blocks: many(documentBlocks),
}));

export const documentBlocksRelations = relations(documentBlocks, ({ one }) => ({
  document: one(documents, {
    fields: [documentBlocks.documentId],
    references: [documents.id],
  }),
  section: one(documentSections, {
    fields: [documentBlocks.sectionId],
    references: [documentSections.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentSection = typeof documentSections.$inferSelect;
export type NewDocumentSection = typeof documentSections.$inferInsert;
export type DocumentBlock = typeof documentBlocks.$inferSelect;
export type NewDocumentBlock = typeof documentBlocks.$inferInsert;
export type BlockLock = typeof blockLocks.$inferSelect;
export type NewBlockLock = typeof blockLocks.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
