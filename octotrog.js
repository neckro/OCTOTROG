"use strict";
var irc = require('irc');
var relaybot = require('./relaybot');
var sprintf = require('sprintf').sprintf;

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
        },
        "team": {
          description: "Show your team info, if you're on one.",
          response: function(opt) {
            var nick = opt.nick;
            var teams = this.bot.saved.teams;
            var team_name;
            if (!teams) return;
            if (typeof opt.params[0] === 'string') nick = opt.params[0];
            Object.keys(teams).some(function(name) {
              var members = teams[name];
              if (!Array.isArray(members)) return;
              if (members.indexOf(nick.toLowerCase()) !== -1) {
                team_name = name;
                return true;
              }
            });
            if (team_name) {
              this.bot.main_client.say(opt.reply, sprintf(
                'PLAYER %s ON TEAM: %s http://dobrazupa.org/tournament/0.13/clans/%s.html http://dobrazupa.org/tournament/0.13/players/%s.html',
                nick.toUpperCase(),
                team_name,
                teams[team_name][0].toLowerCase(),
                nick.toLowerCase()
              ));
              this.bot.say_text(opt.reply,
                'members: %s (captain), %s',
                teams[team_name].shift(),
                teams[team_name].join(', ')
              );
            } else {
              this.bot.say_text(opt.reply, 'player %s is not on a team.', nick);
            }
          }
        }
      },
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
