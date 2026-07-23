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
CREATE INDEX `product_categories_product_idx` ON `product_categories` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_categories_category_idx` ON `product_categories` (`category_id`);--> statement-breakpoint
INSERT INTO `product_categories` (`id`, `product_id`, `category_id`, `position`)
SELECT SUBSTRING(REPLACE(UUID(), '-', ''), 1, 21), `p`.`id`, `p`.`category_id`, 0
FROM `products` `p`
INNER JOIN `categories` `c` ON `c`.`id` = `p`.`category_id`;