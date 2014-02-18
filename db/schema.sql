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
