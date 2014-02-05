var crawl = require('../plugins/crawl');

crawl.parsers.forEach(function(p) {
  p.tests.forEach(function(t) {
    var parsed = crawl.parse_message(crawl.parsers, t);
    console.log(t);
    console.log(parsed.info);
  });
});
