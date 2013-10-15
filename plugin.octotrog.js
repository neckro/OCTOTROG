"use strict";
var sprintf = require('sprintf').sprintf;

module.exports = {
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
            teams[team_name][0],
            teams[team_name].slice(1).join(', ')
          );
        } else {
          this.bot.say_text(opt.reply, 'player %s is not on a team.', nick);
        }
      }
    }
  }
};
