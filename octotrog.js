"use strict";
var irc = require('irc');
var relaybot = require('./relaybot');

var bot_options = {
  main_server: "irc.lunarnet.org",
  main_channel: "#octolog",
  relay_server: "chat.freenode.net",
  relay_channel: "##crawl",
  main_nick: "OCTOTROG",
  relay_nick: null,
  irc_options: {
    userName: "octotrog",
    realName: "OCTOTROG",
    debug: true,
    showErrors: true
  },
  savefile: './octosave.json',
  command_regex: /^[!$?%@]/,
  sayings: {
    tourney_info: "Tournament starts on Oct 11, 2013 at 20:00 UTC, and ends on Oct 27, 2013 at 20:00 UTC. More info: http://dobrazupa.org/tournament/0.13/",
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
  plugins: [
    require('./plugin.watchlist'),
    require('./plugin.crawl'),
    {
      name: "OCTOTROG",
      prefix: "!",
      commands: {
        "tourney": {
          description: "Show tourney info.",
          response: function(opt) {
            this.bot.main_client.say(opt.reply, this.bot.sayings.tourney_info);
          }
        }
      }
    }
  ],
  say_transform: function(text) {
    return text.toString().toUpperCase();
  }
};

if (process.argv[2] === 'test') {
  bot_options.main_channel = '#octotest';
  bot_options.main_nick = 'TESTTROG';
}

module.exports = relaybot.create(bot_options);
