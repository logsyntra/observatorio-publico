ALTER TABLE `public_entities` ADD `official_identifier` text;
--> statement-breakpoint
ALTER TABLE `public_entities` ADD `identifier_type` text;
--> statement-breakpoint
CREATE INDEX `public_entities_official_identifier_idx` ON `public_entities` (`identifier_type`,`official_identifier`);
--> statement-breakpoint
PRAGMA optimize;
