"use strict";
var sprintf = require('sprintf').sprintf;

module.exports = {
  name: "OCTOTROG",
  prefix: "",
  commands: {
    "!tourney": {
      description: "Show tourney info.",
      response: function(opt) {
        this.bot.main_client.say(opt.reply, this.bot.sayings.tourney_info);
      }
    },
    "!dbadd": {
      description: "!dbadd <term> <entry>: Add an entry to the database. Use {braces} if term is multiple words!",
      response: function(opt) {
        var parsed = opt.text.match(/^((\{(.+)\})|([^ ]+)) (.*)$/);
        if (!parsed || parsed.length < 5) {
          this.bot.say_text(opt.reply, 'Trog smash bad entry.');
          return;
        }
        var term = parsed[4] || parsed[3];
        var def = parsed[5];
        if (this.bot.store_saved('info', term, def)) {
          this.bot.say_text(opt.reply, 'Trog save entry for %s.', term);
        } else {
          this.bot.say_text(opt.reply, 'Trog have enraging problem saving entry for %s.', term);
        }
      }
    },
    "!dbremove": {
      description: "Remove an entry from the database.",
      response: function(opt) {
        if (this.bot.delete_saved('info', opt.text)) {
          this.bot.say_text(opt.reply, 'Trog destroy entry for %s.', opt.text);
        } else {
          this.bot.say_text(opt.reply, 'Trog no see entry for %s.', opt.text);
        }
      }
    },
    "!dblist": {
      description: "List all terms in the database.",
      response: function(opt) {
        this.bot.say_text(opt.reply, '{' + Object.keys(this.bot.saved.info).sort().join('} {') + '}');
      }
    },
    "?!": {
      description: "Show an entry from the OCTOTROG database.  Use !dbadd to add new terms.",
      no_space: true,
      response: function(opt) {
        var term = opt.text;
        if (term.length > 0) {
          var def = this.bot.get_saved('info', term);
          var redirect;
          if (typeof def === 'string') redirect = def.match(/^\{(.*)\}$/);
          if (redirect) def = this.bot.get_saved('info', redirect[1]);
          if (def) {
            this.bot.main_client.say(opt.reply, sprintf('{%s}: %s', term, def));
          } else {
            this.bot.say_text(opt.reply, 'No definition for %s', term);
          }
        } else {
          this.bot.say_text(opt.reply, opt.command.description);
        }
      }
    },
    "!team": {
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
