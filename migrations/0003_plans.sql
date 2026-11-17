-- Migration number: 0003 	 2026-11-17T09:00:49.625Z
ALTER TABLE users ADD COLUMN plan_until INTEGER;
ALTER TABLE price_lists ADD COLUMN publish_day TEXT;
ALTER TABLE price_lists ADD COLUMN publish_count INTEGER NOT NULL DEFAULT 0;