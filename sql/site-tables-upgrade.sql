-- Idempotent upgrade for existing Sanctum website tables.
-- Safe to re-run: creates missing tables, columns, and indexes without dropping data.
-- Requires MariaDB 10.0.2+ (ADD COLUMN IF NOT EXISTS).
--
-- Usage:
--   mysql -h HOST -u USER -p xidb < sql/site-tables-upgrade.sql

-- ---------------------------------------------------------------------------
-- site_discord_users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_discord_users (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE site_discord_users
  ADD COLUMN IF NOT EXISTS username VARCHAR(64) NOT NULL DEFAULT '' AFTER discord_id,
  ADD COLUMN IF NOT EXISTS global_name VARCHAR(128) NULL AFTER username,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL AFTER global_name,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL AFTER avatar_url,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER last_login_at,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ---------------------------------------------------------------------------
-- site_discord_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_discord_links (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE site_discord_links
  ADD COLUMN IF NOT EXISTS account_id int(10) unsigned NULL AFTER discord_id,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER account_id;

-- Backfill NOT NULL only when every row has an account_id (manual linking required).
-- Skip MODIFY here so partially-created tables do not fail the upgrade script.

ALTER TABLE site_discord_links
  ADD UNIQUE INDEX IF NOT EXISTS uk_site_discord_links_account (account_id);

-- ---------------------------------------------------------------------------
-- site_profile_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_profile_settings (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE site_profile_settings
  ADD COLUMN IF NOT EXISTS show_avatar TINYINT(1) NOT NULL DEFAULT 1 AFTER discord_id,
  ADD COLUMN IF NOT EXISTS show_username TINYINT(1) NOT NULL DEFAULT 1 AFTER show_avatar;

-- ---------------------------------------------------------------------------
-- site_launcher_refresh_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_launcher_refresh_tokens (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE site_launcher_refresh_tokens
  ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32) NOT NULL DEFAULT '' AFTER id,
  ADD COLUMN IF NOT EXISTS token_hash CHAR(64) NOT NULL DEFAULT '' AFTER discord_id,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL AFTER token_hash,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER expires_at,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL AFTER created_at;

ALTER TABLE site_launcher_refresh_tokens
  ADD UNIQUE INDEX IF NOT EXISTS uk_site_launcher_refresh_hash (token_hash),
  ADD INDEX IF NOT EXISTS idx_site_launcher_refresh_discord (discord_id);

-- ---------------------------------------------------------------------------
-- site_news  (home-page news feed; posts gated by Discord role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_news (
  id int(10) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE site_news
  ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT '' AFTER id,
  ADD COLUMN IF NOT EXISTS body TEXT NOT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS author_discord_id VARCHAR(32) NOT NULL DEFAULT '' AFTER body,
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(128) NULL AFTER author_discord_id,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER author_name;

ALTER TABLE site_news
  ADD INDEX IF NOT EXISTS idx_site_news_published (published_at DESC);
