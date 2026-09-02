CREATE TABLE `flip_hotspots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`kind` text DEFAULT 'link' NOT NULL,
	`label` text DEFAULT 'Open' NOT NULL,
	`href` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`width` real NOT NULL,
	`height` real NOT NULL,
	`animation` text DEFAULT 'glow' NOT NULL,
	`target` text DEFAULT '_blank' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `flip_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_flip_hotspots_project_page` ON `flip_hotspots` (`project_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `flip_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`title` text DEFAULT 'Untitled page' NOT NULL,
	`image_key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`layout` text DEFAULT 'single' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `flip_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_flip_pages_project` ON `flip_pages` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_flip_pages_number` ON `flip_pages` (`project_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `flip_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_pdf_key` text,
	`published_version_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flip_projects_slug_unique` ON `flip_projects` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_flip_projects_owner` ON `flip_projects` (`owner_email`);--> statement-breakpoint
CREATE TABLE `flip_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`label` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `flip_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_flip_versions_project` ON `flip_versions` (`project_id`,`version_number`);