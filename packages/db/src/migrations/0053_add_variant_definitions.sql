CREATE TABLE `variant_definitions` (
	`id` varchar(21) NOT NULL,
	`store_id` varchar(21) NOT NULL,
	`key` varchar(32) NOT NULL,
	`label` varchar(50) NOT NULL,
	`kind` enum('size','color','custom') NOT NULL DEFAULT 'custom',
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `variant_definitions_store_key_unique` UNIQUE(`store_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `variant_values` (
	`id` varchar(21) NOT NULL,
	`definition_id` varchar(21) NOT NULL,
	`label` varchar(100) NOT NULL,
	`color_hex` varchar(7),
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `variant_values_unique` UNIQUE(`definition_id`,`label`)
);
--> statement-breakpoint
CREATE INDEX `variant_definitions_store_idx` ON `variant_definitions` (`store_id`);--> statement-breakpoint
CREATE INDEX `variant_values_definition_idx` ON `variant_values` (`definition_id`);
