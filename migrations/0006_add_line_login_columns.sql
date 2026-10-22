-- migrations/0006_add_line_login_columns.sql
-- Add LINE login fields to users table for LINE QR code login and user permission mapping

ALTER TABLE users ADD COLUMN line_user_id TEXT;
ALTER TABLE users ADD COLUMN line_display_name TEXT;
ALTER TABLE users ADD COLUMN line_picture_url TEXT;

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
