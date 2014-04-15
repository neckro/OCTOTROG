var crawl = require('../plugins/crawl');
var twitter = require('../plugins/crawl.twitter');

crawl.parsers.forEach(function(p) {
//  if (p.event !== 'player_milestone') return;
  p.tests.forEach(function(t) {
    var parsed = crawl.parse_message(crawl.parsers, t);
    console.log(t);
    console.log(parsed.info);
    console.log(parsed.matches);
  });
});
