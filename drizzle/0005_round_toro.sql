DROP INDEX `candidate_assets_candidate_idx`;--> statement-breakpoint
CREATE INDEX `candidate_assets_candidate_value_idx` ON `candidate_assets` (`candidate_id`,`value_cents`);--> statement-breakpoint
DROP INDEX `candidate_social_candidate_idx`;