-- Prompts table scoped to authenticated users
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user_updated ON prompts(user_id, updated_at DESC);

-- Trigger to keep updated_at in sync (D1 supports SQLite syntax)
CREATE TRIGGER IF NOT EXISTS trg_prompts_updated
AFTER UPDATE ON prompts
FOR EACH ROW
BEGIN
  UPDATE prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


