CREATE TABLE `public_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_name` text NOT NULL,
	`full_name` text NOT NULL,
	`display_name` text NOT NULL,
	`entity_type` text NOT NULL,
	`public_role` text NOT NULL,
	`is_public_figure` integer DEFAULT false NOT NULL,
	`candidate_id` text,
	`profile_url` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`source_record_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `public_entities_normalized_name_idx` ON `public_entities` (`normalized_name`);
--> statement-breakpoint
CREATE INDEX `public_entities_candidate_idx` ON `public_entities` (`candidate_id`);
--> statement-breakpoint
CREATE TABLE `public_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_candidate_id` text NOT NULL,
	`object_entity_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`relation_label` text NOT NULL,
	`started_at` text,
	`ended_at` text,
	`verification_state` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`subject_candidate_id`) REFERENCES `candidates`(`source_record_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`object_entity_id`) REFERENCES `public_entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `public_relations_subject_type_idx` ON `public_relations` (`subject_candidate_id`,`relation_type`);
--> statement-breakpoint
CREATE INDEX `public_relations_object_idx` ON `public_relations` (`object_entity_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_relations_subject_object_label_idx` ON `public_relations` (`subject_candidate_id`,`object_entity_id`,`relation_label`);
--> statement-breakpoint
CREATE TABLE `relation_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`relation_id` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`source_url` text NOT NULL,
	`published_at` text,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`relation_id`) REFERENCES `public_relations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `relation_evidence_relation_idx` ON `relation_evidence` (`relation_id`);
--> statement-breakpoint
PRAGMA optimize;
