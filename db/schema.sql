CREATE TABLE IF NOT EXISTS deaths (
  id INTEGER,
  server TEXT,
  version TEXT,
  score INTEGER,
  player TEXT,
  race CHAR(2),
  class CHAR(2),
  title TEXT,
  god TEXT,
  place TEXT,
  fate TEXT,
  xl INTEGER,
  turns INTEGER,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration TEXT,
  morgue TEXT,
  UNIQUE (player, race, class, xl, turns)
  ON CONFLICT REPLACE
);

CREATE TABLE IF NOT EXISTS watchlist (
  player TEXT PRIMARY KEY NOT NULL,
  last_seen DATETIME
);

CREATE TABLE IF NOT EXISTS dictionary (
  term TEXT PRIMARY KEY NOT NULL,
  def TEXT,
  updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER,
  start DATETIME,
  end DATETIME,
  race CHAR(2),
  class CHAR(2)
);

DROP VIEW IF EXISTS challenge_attempts;
CREATE VIEW challenge_attempts AS
  SELECT d.*, c.id AS challenge_id, c.start, c.end,
  d.race || d.class || " " || DATE(c.start) || " through " || DATE(c.end, '-10 hours') AS challenge_desc
  FROM challenges c
    JOIN deaths d USING (race, class)
    WHERE d.date BETWEEN c.start AND c.end
;

DROP VIEW IF EXISTS challenge_best_attempts;
CREATE VIEW challenge_best_attempts AS
  SELECT a.*, m.attempts FROM challenge_attempts a
  JOIN (
    SELECT challenge_id, player, MAX(score) AS score, COUNT(score) AS attempts FROM challenge_attempts GROUP BY player, challenge_id
  ) m USING (challenge_id, player, score)
;

DROP VIEW IF EXISTS challenge_current;
CREATE VIEW challenge_current AS
  SELECT g.* FROM challenge_best_attempts g
  WHERE g.challenge_id IN (
    SELECT id FROM challenges c WHERE DATETIME('now', 'utc') BETWEEN c.start AND c.end
  )
  ORDER BY g.challenge_id DESC, g.score DESC
;

DROP VIEW IF EXISTS challenge_winners;
CREATE VIEW challenge_winners AS 
  SELECT g.* FROM (SELECT * FROM challenge_best_attempts ORDER BY score) g
  JOIN challenges c ON (
    g.challenge_id = c.id
    AND DATETIME('now', 'utc') > c.end
  )
  GROUP BY g.challenge_id;
