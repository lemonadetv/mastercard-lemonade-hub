CREATE TABLE `hotspots` (
	`id` text PRIMARY KEY NOT NULL,
	`page` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`width` real NOT NULL,
	`height` real NOT NULL,
	`href` text NOT NULL,
	`label` text DEFAULT 'Open link' NOT NULL,
	`kind` text DEFAULT 'link' NOT NULL,
	`animation` text DEFAULT 'none' NOT NULL,
	`target` text DEFAULT '_blank' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hotspots_page` ON `hotspots` (`page`);