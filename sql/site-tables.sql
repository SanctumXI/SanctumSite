-- Sanctum website tables (run against game database, e.g. xidb)
-- Fresh install: use this file.
-- Existing tables missing columns: use site-tables-upgrade.sql (safe to re-run).
--
-- Types use int(10) unsigned to match accounts.id / chars.accid in xidb.
-- If your SQL editor flags UNSIGNED as "invalid column reference", that is usually
-- an IDE parser bug (e.g. DBeaver). The script is valid MariaDB — run via mysql CLI.

CREATE TABLE IF NOT EXISTS site_discord_users (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  global_name VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_discord_links (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY,
  account_id int(10) unsigned NOT NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_site_discord_links_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_profile_settings (
  discord_id VARCHAR(32) NOT NULL PRIMARY KEY,
  show_avatar TINYINT(1) NOT NULL DEFAULT 1,
  show_username TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_launcher_refresh_tokens (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(32) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  UNIQUE KEY uk_site_launcher_refresh_hash (token_hash),
  KEY idx_site_launcher_refresh_discord (discord_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
