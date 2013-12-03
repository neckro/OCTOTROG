<?php
ob_start();

class TrogReport {
  protected static $dbfile = '../db/save.db';
  protected $col_titles = array(
    'xl' => 'XL',
    'class' => 'Char',
  );
  protected $col_right_align = array(
    'score', 'place', 'xl', 'turns', 'duration', 'attempts'
  );
  protected $col_hidden = array('race', 'morgue');

  public function __construct($title = null) {
    $this->title = $title;

    // PHP is stupid, can't put these in class def
    $this->col_replace = array(
      'score' => function($e, $r) {
        return sprintf('<a href="%s">%u</a>', $r['morgue'], $r['score']);
      },
      'class' => function($e, $r) {
        return $r['race'] . $r['class'];
      },
      'fate' => function($e, $r) {
        return str_replace('(', '<br />(', $e);
      },
      'god' => function($e, $r) {
        if ($e === 'Trog') return '<b>TROG</b>';
        return $e;
      },
      'player' => function($e, $r) {
        return sprintf('<a href="?player=%s">%s</a>', $e, $e);
      }
    );
  }

  public static function get_db() {
    static $db = null;
    if ($db === null) $db = new SQLite3(static::$dbfile, SQLITE3_OPEN_READONLY);
    return $db;
  }

  public static function prepare($q) {
    return static::get_db()->prepare($q);
  }

  public function printTable($query, $bindings = array()) {
    $stmt = static::prepare($query);
    foreach ($bindings as $k => $d) {
      $stmt->bindValue($k, $d);
    }
    $result = $stmt->execute();
    $out = '';
    if (!empty($this->title)) {
      $out .= sprintf("<h2>%s</h2>", $this->title);
    }
    $out .= "<table>\n";
    $r = $result->fetchArray(SQLITE3_ASSOC);
    if (empty($r)) {
      return '<p style="text-align: center;">No games found.</p>';
    }
    // Headers
    $out .= "<tr>";
    foreach (array_keys($r) as $k) {
      if (in_array($k, $this->col_hidden)) continue;
      if (array_key_exists($k, $this->col_titles)) {
        $d = $this->col_titles[$k];
      } else {
        $d = ucfirst($k);
      }
      $out .= sprintf('<th>%s</th>', $d);
    }
    $out .= "<tr>\n";

    // Data
    do {
      $row = '';
      foreach ($r as $k => $d) {
        if (in_array($k, $this->col_hidden)) continue;
        if (array_key_exists($k, $this->col_replace)) {
          $d = $this->col_replace[$k](htmlentities($d), $r);
        }
        $row .= sprintf(
          '<td%s>%s</td>',
          in_array($k, $this->col_right_align) ? ' style="text-align: right;"' : '',
          $d
        );
      }
      $out .= "<tr>" . $row . "</tr>\n";
    } while ($r = $result->fetchArray(SQLITE3_ASSOC));
    $out .= "</table>\n";
    return $out;
  }

  public static function listPlayers() {
    $result = TrogReport::get_db()->query('SELECT player, COUNT(player) AS games FROM deaths GROUP BY player');
    $out = '<p style="text-align: center;">Total Records: ';
    while ($r = $result->fetchArray(SQLITE3_ASSOC)) {
      $out .= sprintf('<a href="?player=%s">%s</a> (%u) ', $r['player'], $r['player'], $r['games']);
    }
    return $out . "</p>\n";
  }

  public static function showHistory($limit = 10) {
    $r = new TrogReport(sprintf('Last %u Recorded Games', $limit));
    return $r->printTable(
      'SELECT * FROM deaths ORDER BY date DESC limit :limit',
      array(
        ':limit' => $limit
      )
    );
  }

  public static function showPlayerHistory($player, $limit = 10) {
    $r = new TrogReport(sprintf('Last %u Recorded Games for %s', $limit, $player));
    return $r->printTable(
      'SELECT * FROM deaths WHERE player=:player ORDER BY date DESC limit :limit',
      array(
        ':player' => $player,
        ':limit' => $limit
      )
    );
  }

  public static function showPlayerTop($player, $limit = 10) {
    $r = new TrogReport(sprintf('Top %u Recorded Games for %s', $limit, $player));
    return $r->printTable(
      'SELECT * FROM deaths WHERE player=:player ORDER BY score DESC limit :limit',
      array(
        ':player' => $player,
        ':limit' => $limit
      )
    );
  }

  public static function showCombo($race, $class, $dmin, $dmax, $limit = 100) {
    $r = new TrogReport(sprintf(
      'Individual Top %s%s, %s-%s (UTC)',
      $race, $class,
      str_replace('-', '/', substr($dmin, 5)),
      str_replace('-', '/', substr($dmax, 5))
    ));
    return $r->printTable(
      'SELECT *, best.attempts AS attempts FROM deaths
      JOIN (
        SELECT player,
        MAX(score) AS score,
        COUNT(player) AS attempts
        FROM deaths
          WHERE DATE(`date`) BETWEEN :dmin AND :dmax
          AND race=:race AND class=:class
          GROUP BY player
      ) best USING (player, score)
      ORDER BY score DESC LIMIT :limit',
      array(
        ':dmin' => $dmin,
        ':dmax' => $dmax,
        ':race' => $race,
        ':class' => $class,
        ':limit' => $limit
      )
    );
  }

}
?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"> 
<head>
<link rel="stylesheet" type="text/css" href="http://netdna.bootstrapcdn.com/bootstrap/3.0.2/css/bootstrap.min.css" />
<link rel="stylesheet" type="text/css" href="http://fonts.googleapis.com/css?family=New+Rocker" />
<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
<title>OCTOTROG</title>
<style type="text/css">
table td, table th {
  padding: 3px;
  border: 1px solid black;
}
table th {
  background-color: #ffaaaa;
}
table {
  margin: 2em auto;
}
h1, h2 {
  font-family: "New Rocker";
  color: black;
  text-align: center;
}
h1 {
  font-size: 46px;
  text-shadow:
   1px  1px 2px red,
  -1px  1px 2px red,
   1px -1px 2px red,
  -1px -1px 2px red;
}
p {
  margin: 1em auto;
}
</style>
</head>
<body>

<div class="container">

<div style="position: relative;">
  <img src="octotrog.png" style="display: block; margin: 0 auto;" />
  <div style="position: absolute; bottom: -10px; width: 100%;">
    <h1 class="text-center"><em>OCTOTROG</em></h1>
  </div>
</div>

<?php
if (!empty($_GET['player'])) {
  echo TrogReport::showPlayerHistory($_GET['player'], 5);
  echo TrogReport::showPlayerTop($_GET['player'], 5);
} else {
  echo TrogReport::listPlayers();
  echo TrogReport::showHistory(10);
  echo TrogReport::showCombo('Mi', 'Fi', '2013-12-02', '2013-12-08');
  echo TrogReport::showCombo('Hu', 'Wn', '2013-11-25', '2013-12-01');
  echo TrogReport::showCombo('Gh', 'EE', '2013-11-18', '2013-11-24');
}
?>
</div>

</body>
</html>
