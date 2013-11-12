"use strict";
var irc = require('irc');
var ircbot = require('./ircbot');

var bot, bot_options = {
  server: "irc.lunarnet.org",
  main_channel: "#octolog",
  nick: "OCTOTROG",
  irc: {
    userName: "octotrog",
    realName: "OCTOTROG",
    debug: true,
    showErrors: true
  },
  savefile: './save.json',
  command_regex: /^[!$?%@]/,
  sayings: {
    tourney_info: "Tournament ends on Oct 27, 2013 at 20:00 UTC. http://dobrazupa.org/tournament/0.13/overview.html",
    greeting: "kill them all?",
    kicked: irc.colors.wrap('light_red', 'trog vigorously angry.'),
    help: "my commands are: %s. praise be to trog.",
    help_not_available: "no help available for: %s",
    help_not_found: "command does not exist: %s",
    watched: "i am watching: %s. praise be to trog.",
    watched_already: "cowardly weakling! i am already watching %s.",
    unwatched_already: "cowardly weakling! i was not watching %s.",
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

bot = ircbot.create(bot_options);
bot.load_plugin('watchlist');
bot.load_plugin('crawl');
bot.load_plugin('octotrog');

module.exports = bot;
