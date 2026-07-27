CREATE TABLE `product_categories` (
	`id` varchar(21) NOT NULL,
	`product_id` varchar(21) NOT NULL,
	`category_id` varchar(21) NOT NULL,
	`position` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_unique` UNIQUE(`product_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `variant_definitions` (
	`id` varchar(21) NOT NULL,
	`store_id` varchar(21) NOT NULL,
	`key` varchar(32) NOT NULL,
	`label` varchar(50) NOT NULL,
	`kind` enum('size','color','custom') NOT NULL DEFAULT 'custom',
	`is_active` boolean NOT NULL DEFAULT true,
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
ALTER TABLE `product_units` ADD `images` json DEFAULT ('[]');--> statement-breakpoint
CREATE INDEX `product_categories_product_idx` ON `product_categories` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_categories_category_idx` ON `product_categories` (`category_id`);--> statement-breakpoint
INSERT INTO `product_categories` (`id`, `product_id`, `category_id`, `position`)
SELECT SUBSTRING(REPLACE(UUID(), '-', ''), 1, 21), `p`.`id`, `p`.`category_id`, 0
FROM `products` `p`
INNER JOIN `categories` `c` ON `c`.`id` = `p`.`category_id`;--> statement-breakpoint
CREATE INDEX `variant_definitions_store_idx` ON `variant_definitions` (`store_id`);--> statement-breakpoint
CREATE INDEX `variant_values_definition_idx` ON `variant_values` (`definition_id`);
