import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const candidates = sqliteTable("candidates", {
  sourceRecordId: text("source_record_id").primaryKey(),
  electionYear: integer("election_year").notNull(),
  electionName: text("election_name").notNull(),
  electionDate: text("election_date").notNull(),
  state: text("state").notNull(),
  electoralUnit: text("electoral_unit").notNull(),
  office: text("office").notNull(),
  candidateNumber: integer("candidate_number").notNull(),
  fullName: text("full_name").notNull(),
  ballotName: text("ballot_name").notNull(),
  socialName: text("social_name"),
  searchName: text("search_name").notNull(),
  partyNumber: integer("party_number").notNull(),
  partyAcronym: text("party_acronym").notNull(),
  partyName: text("party_name").notNull(),
  candidacyStatus: text("candidacy_status").notNull(),
  occupation: text("occupation").notNull(),
  education: text("education").notNull(),
  sourceGeneratedAt: text("source_generated_at").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (table) => [
  index("candidates_search_name_idx").on(table.searchName),
  index("candidates_state_office_idx").on(table.state, table.office),
  index("candidates_party_idx").on(table.partyAcronym),
]);

export const sourceSnapshots = sqliteTable("source_snapshots", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  publisher: text("publisher").notNull(),
  datasetUrl: text("dataset_url").notNull(),
  resourceUrl: text("resource_url").notNull(),
  license: text("license").notNull(),
  sourceUpdatedAt: text("source_updated_at").notNull(),
  importedAt: text("imported_at").notNull(),
  recordCount: integer("record_count").notNull(),
});

export const candidateDetails = sqliteTable("candidate_details", {
  candidateId: text("candidate_id").primaryKey().references(() => candidates.sourceRecordId, { onDelete: "cascade" }),
  ageAtInauguration: integer("age_at_inauguration"),
  nationality: text("nationality").notNull(),
  birthCity: text("birth_city").notNull(),
  isReelection: text("is_reelection").notNull(),
  declaresAssets: text("declares_assets").notNull(),
  campaignExpenseLimitCents: integer("campaign_expense_limit_cents"),
  registrationProcessNumber: text("registration_process_number").notNull(),
  judgmentStatus: text("judgment_status").notNull(),
  acceptedAt: text("accepted_at"),
  assetCount: integer("asset_count").notNull().default(0),
  assetTotalCents: integer("asset_total_cents").notNull().default(0),
  socialCount: integer("social_count").notNull().default(0),
}, (table) => [
  index("candidate_details_judgment_idx").on(table.judgmentStatus),
]);

export const candidateAssets = sqliteTable("candidate_assets", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidates.sourceRecordId, { onDelete: "cascade" }),
  itemOrder: integer("item_order").notNull(),
  assetType: text("asset_type").notNull(),
  description: text("description").notNull(),
  valueCents: integer("value_cents").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("candidate_assets_candidate_value_idx").on(table.candidateId, table.valueCents),
  uniqueIndex("candidate_assets_candidate_order_idx").on(table.candidateId, table.itemOrder),
]);

export const candidateSocialLinks = sqliteTable("candidate_social_links", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => candidates.sourceRecordId, { onDelete: "cascade" }),
  itemOrder: integer("item_order").notNull(),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
}, (table) => [
  uniqueIndex("candidate_social_candidate_order_idx").on(table.candidateId, table.itemOrder),
]);

export const publicEntities = sqliteTable("public_entities", {
  id: text("id").primaryKey(),
  normalizedName: text("normalized_name").notNull(),
  fullName: text("full_name").notNull(),
  displayName: text("display_name").notNull(),
  entityType: text("entity_type").notNull(),
  publicRole: text("public_role").notNull(),
  isPublicFigure: integer("is_public_figure", { mode: "boolean" }).notNull().default(false),
  candidateId: text("candidate_id").references(() => candidates.sourceRecordId, { onDelete: "set null" }),
  profileUrl: text("profile_url"),
  officialIdentifier: text("official_identifier"),
  identifierType: text("identifier_type"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("public_entities_normalized_name_idx").on(table.normalizedName),
  index("public_entities_candidate_idx").on(table.candidateId),
  index("public_entities_official_identifier_idx").on(table.identifierType, table.officialIdentifier),
]);

export const publicRelations = sqliteTable("public_relations", {
  id: text("id").primaryKey(),
  subjectCandidateId: text("subject_candidate_id").notNull().references(() => candidates.sourceRecordId, { onDelete: "cascade" }),
  objectEntityId: text("object_entity_id").notNull().references(() => publicEntities.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  relationLabel: text("relation_label").notNull(),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  verificationState: text("verification_state").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
}, (table) => [
  index("public_relations_subject_type_idx").on(table.subjectCandidateId, table.relationType),
  index("public_relations_object_idx").on(table.objectEntityId),
  uniqueIndex("public_relations_subject_object_label_idx").on(table.subjectCandidateId, table.objectEntityId, table.relationLabel),
]);

export const relationEvidence = sqliteTable("relation_evidence", {
  id: text("id").primaryKey(),
  relationId: text("relation_id").notNull().references(() => publicRelations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  sourceUrl: text("source_url").notNull(),
  publishedAt: text("published_at"),
  capturedAt: text("captured_at").notNull(),
}, (table) => [
  index("relation_evidence_relation_idx").on(table.relationId),
]);
