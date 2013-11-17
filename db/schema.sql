CREATE TABLE IF NOT EXISTS deaths (
  game_id INTEGER,
  player TEXT,
  title TEXT,
  level INTEGER,
  race CHAR(2),
  class CHAR(2),
  god TEXT,
  fate TEXT,
  location TEXT,
  time DATETIME DEFAULT CURRENT_TIMESTAMP,
  points INTEGER,
  turns INTEGER,
  morgue TEXT,
  PRIMARY KEY (game_id, player)
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
