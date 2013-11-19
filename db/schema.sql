CREATE TABLE IF NOT EXISTS deaths (
  player TEXT,
  title TEXT,
  xl INTEGER,
  race CHAR(2),
  class CHAR(2),
  god TEXT,
  fate TEXT,
  place TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  score INTEGER,
  turns INTEGER,
  morgue TEXT,
  duration TEXT,
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
