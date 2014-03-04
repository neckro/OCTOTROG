"use strict";
var irc = require('irc');
var ircbot = require('./src/ircbot');

var bot_options = {
  server: "irc.lunarnet.org",
  nick: "OCTOTROG",
  main_channel: '#octolog',
  irc: {
    userName: "octotrog",
    realName: "OCTOTROG",
    debug: true,
    showErrors: true,
  },
  sayings: {
    greeting: "kill them all?",
    kicked: irc.colors.wrap('light_red', 'trog vigorously angry.'),
    help: "my commands are: %s. praise be to trog.",
    help_not_available: "no help available for: %s",
    watched: "i am watching: %s. praise be to trog.",
    watched_already: "foolish weakling! i am already watching %s.",
    unwatched_already: "foolish weakling! i was not watching %s.",
    watch_added: "i am now watching %s. praise be to trog.",
    watch_removed: "i have let %s wander from my gaze. praise be to trog.",
    database_error: "trog have problem with read and write."
  },
  say_transform: function(text) {
    return text.toString().toUpperCase();
  }
};

if (process.argv[2] === 'test') {
  bot_options.main_channel = '#octotest';
  bot_options.nick = 'TESTTROG';
  var crawl_options = {
    relay_nick: 'TESTTROG',
    relay_server: 'irc.freenode.net',
    relay_channels: ['#octotest']
  };
}

var bot = new ircbot(bot_options);
bot.load_plugin('database');
bot.load_plugin('dictionary');
bot.load_plugin('watchlist');
bot.load_plugin('crawl', crawl_options || {});
bot.load_plugin('crawl.www');

module.exports = bot;
