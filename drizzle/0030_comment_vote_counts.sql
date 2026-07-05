ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislike_count INTEGER NOT NULL DEFAULT 0;
UPDATE comments c SET
  like_count = COALESCE((SELECT count(*) FROM comment_votes v WHERE v.comment_id = c.id AND v.vote = 1), 0),
  dislike_count = COALESCE((SELECT count(*) FROM comment_votes v WHERE v.comment_id = c.id AND v.vote = -1), 0)
WHERE EXISTS (SELECT 1 FROM comment_votes v WHERE v.comment_id = c.id);
