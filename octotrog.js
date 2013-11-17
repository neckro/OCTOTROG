"use strict";
var irc = require('irc');
var ircbot = require('./ircbot');

var bot, bot_options = {
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
    watch_removed: "i have let %s wander from my gaze. praise be to trog."
  },
  say_transform: function(text) {
    return text.toString().toUpperCase();
  }
};

if (process.argv[2] === 'test') {
  bot_options.main_channel = '#octotest';
  bot_options.nick = 'TESTTROG';
}

bot = new ircbot(bot_options);
bot.load_plugin('watchlist');
bot.load_plugin('crawl');
bot.load_plugin('dictionary');

module.exports = bot;
