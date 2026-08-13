ALTER TABLE `ai_credit_debits` ADD `image_key` varchar(500);
--> statement-breakpoint
UPDATE `ai_credit_debits`
SET `image_key` = CONCAT(
  `store_id`,
  '/products/',
  SUBSTRING_INDEX(`dedup_key`, ':', -1),
  CASE
    WHEN `dedup_key` LIKE 'imgenh:%' THEN '-ai.webp'
    ELSE '-bg.webp'
  END
)
WHERE `kind` = 'image_enhancement'
  AND (`dedup_key` LIKE 'imgenh:%' OR `dedup_key` LIKE 'imgbg:%');
