"use strict";
var irc = require('irc');
var offer = require('offer');
var extend = require('extend');

module.exports = {
  name: "crawl",
  prefix: "",
  relay_bots: ['Sequell', 'Henzell', 'Gretell', 'Sizzell', 'Lantell', 'necKro', 'Rotatell', 'Rotatelljr'],
  relay_servers: ['Sequell', 'CAO', 'CDO', 'CSZO', 'CLAN', 'neckro', 'CBRO', 'CBRO-mundane'],
  morgue_delay_fresh: 10 * 1000, // ms to wait before requesting fresh morgues
  morgue_delay_moldy: 1 * 1000, // ms to wait before requesting old morgues
  morgue_timeout: 10 * 1000, // Max ms to wait for a morgue response
  morgue_retry_delay: 10 * 1000, // Delay between morgue retries
  morgue_retry_limit: 6, // Max number of times to try getting morgue

  init: function() {
    var options = extend({}, this.bot.irc || {}, {
      channels: ['##crawl']
    });
    this.relay_nick = this.bot.relay_nick || this.bot.nick || 'OCTOTROG';
    this.relay_client = new irc.Client(
      this.bot.relay_server || 'chat.freenode.net',
      this.relay_nick,
      options
    );
    this.relay_client.addListener('message', function(nick, to, text, message) {
      if (this.relay_bots.indexOf(nick) === -1) return;
      this.parse_crawl_message(text, (to === this.bot.nick), this.relay_servers[this.relay_bots.indexOf(nick)]);
    }.bind(this));
    this.relay_client.addListener('error', function() {
      console.warn('relay client error:', arguments);
    });
  },

  destroy: function() {
    this.removeAllListeners();
    this.relay_client.disconnect();
  },

  parse_crawl_message: function(text, privmsg, server) {
    var matches, dispatched;
    // check for player death
    matches = text.match(/^((\d+)(\/\d+)?(\. ))?(\w+) the ([\w ]+) \(L(\d\d?) (\w\w)(\w\w)\), (worshipper of ([\w ]+), )?(.+?)( [io]n (\w+(:\d\d?)?))?( \([^)]*\))?( on ([-0-9]+ [:0-9]+))?, with (\d+) points after (\d+) turns and ([^.]+)\.$/);
    if (matches !== null) {
      dispatched = true;
      this.bot.dispatch('player_death', {
        text: text,
        result_num: matches[2],
        player: matches[5],
        title: matches[6],
        xl: matches[7],
        race: matches[8],
        class: matches[9],
        god: matches[11],
        fate: matches[12],
        place: matches[14],
        date: matches[18],
        score: matches[19],
        turns: matches[20],
        duration: matches[21]
      }, privmsg, server);
    }

    // check for player milestone
    matches = text.match(/^([^(].*) \(L(\d\d?) (\w\w)(\w\w)\) (.*) \(([^)]*)/);
    if (matches !== null) {
      dispatched = true;
      this.bot.dispatch('player_milestone', {
        text: text,
        player: matches[1],
        xl: matches[2],
        race: matches[3],
        class: matches[4],
        milestone: matches[5],
        place: matches[6]
      }, privmsg, server);
    }

    // check for player morgue
    matches = text.match(/^(\d+)(\/\d+)?\. (\w+), XL(\d\d?) (\w\w)(\w\w), T:(\d+): (http:\/\/.*)$/);
    if (matches !== null) {
      this.bot.dispatch('player_morgue', {
        text: text,
        result_num: matches[1],
        player: matches[3],
        xl: matches[4],
        race: matches[5],
        class: matches[6],
        turns: matches[7],
        morgue: matches[8]
      });
    }

    // check for failed morgue request
    matches = text.match(/^No games for (\w+) \((\w\w)(\w\w) xl=(\d\d?) turns=(\d+) score=(\d+)\)\.$/);
    if (matches !== null) {
      this.bot.dispatch('player_morgue_failed', {
        player: matches[1],
        race: matches[2],
        class: matches[3],
        xl: matches[4],
        turns: matches[5],
        score: matches[6]
      });
      // Don't relay the message
      return;
    }

    // Relay all privmsgs that weren't already dispatched
    if (privmsg && !dispatched && server !== 'CBRO-mundane') {
      this.bot.emit('say', false, text + ' (' + server + ')');
    }
  },

  log_death: function(death) {
    delete(death.text);
    delete(death.result_num);
    this.bot.obj_insert('deaths', death, function(e) {
      if (e !== null) console.warn('log_death error', arguments);
    });
  },

  relay: function(remote_bot, opt) {
    // TODO: use opt.reply to allow privmsgs
    this.relay_client.say(remote_bot, (opt.command + ' ' + opt.params.join(' ')).trim());
  },

  listeners: {
    'player_death': function(death, privmsg, server) {
      var self = this;
      // Get !lg from Sequell, and set up handler to process the response
      this.bot.dispatch('check_watchlist', death.player, function(watched) {
        if (privmsg || watched) {
          if (!death.morgue) self.bot.emit('say', false, death.text + ' (' + server + ')');

          // Wait to request morgue
          var delay = death.result_num ? self.morgue_delay_moldy : self.morgue_delay_fresh;
          setTimeout(function() {

            if (watched) {
              // Set handler to catch morgue info
              var cancelMorgue = self.listen(self.morgue_timeout, 'player_morgue', function(info) {
                // Make sure info matches
                if (['player', 'race', 'class', 'turns'].some(function(c) {
                  return (death[c] !== info[c]);
                })) return;
                death.morgue = info.morgue;
                self.log_death(death);
                cancelMorgue();
              });

              // Stash morgue retry count in death object,
              // will be overwritten when request is successful
              death.morgue = (death.morgue || 0) + 1;
              // Set handler to catch failed morgue request
              var cancelMorgueFailure = self.listen(self.morgue_timeout, 'player_morgue_failed', function(info) {
                // Make sure info matches
                if (['player', 'race', 'class', 'xl', 'turns', 'score'].some(function(c) {
                  return (death[c] !== info[c]);
                })) return;
                cancelMorgueFailure();
                if (death.morgue < self.morgue_retry_limit) {
                  // Try again in a little bit
                  setTimeout(function() {
                    self.bot.dispatch('player_death', death);
                  }, self.morgue_retry_delay);
                } else {
                  self.bot.emit('say', "couldn't retrieve morgue for player %s.", death.player + ' (' + server + ')');
                }
              });
            }
            // Do the initial request
            self.relay('Sequell', {
              command: '!lg',
              params: [
                death.player,
                death.race + death.class,
                'xl=' + death.xl,
                'turns=' + death.turns,
                'score=' + death.score,
                '-log'
              ]
            });
          }, delay);
        }
      });
    },

    'player_milestone': function(milestone, privmsg, server) {
      var self = this;
      this.bot.dispatch('check_watchlist', milestone.player, function(watched) {
        if (watched) self.bot.emit('say', false, milestone.text + ' (' + server + ')');
      });
      // TODO: check for ghost kills
    }
  },

  commands: {
    // Sequell
    "!sequell": {
      description: "Pass arbitrary command to Sequell | !sequell !hs . OpBe | Must use . for your nick",
      response: function(opt) {
        var actualcommand = opt.params.join(' ');
        actualcommand = actualcommand.replace(' . ', opt.nick);
        opt.params = [];
        opt.params.push(actualcommand);
        opt.command = '';
        this.relay('Sequell', opt);
      }
    },
    "??": {
      no_space: true,
      description: "Look up an entry in LearnDB.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "s??": {
      no_space: true,
      description: "Search for an entry in LearnDB.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!abyss": {
      description: "Use with caution.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!apt": {
      description: "Looks up aptitudes for specified race/skill combination.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!chars": {
      description: "Lists the frequency of all character types a player started.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!ftw": {
      description: "Abbreviates race/role abbreviations. Example usage: !ftw Troll Berserker",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!gamesby": {
      description: "Summarizes a player's public server career.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!gkills": {
      description: "Lists the top kills for a player's ghost.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!greatplayer": {
      description: "Shows a player's unwon species.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!greaterplayer": {
      description: "Shows a player's unwon backgrounds.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!hs": {
      description: "Lists the highest-scoring game for a player.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!killratio": {
      description: "Usage: !killratio <unique monster> <player>",
      response: function(opt) {
        if (opt.params.length < 2) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!kw": {
      description: "Define keyword: `!kw <keyword> <definition>` to define, `!kw -rm <keyword>` to delete, `!kw <keyword>` to query, `!kw -ls` to list.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!lairratio": {
      description: "Shows how often a player reaches the Lair.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!lg": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !lg (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!listgame": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !listgame (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!lm": {
      description: "Lists milestones for the specified player. Usage: !lm (<player>) (<number>) (options) where options are in the form field=value, or (max|min)=field. See ??milestone for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!locateall": {
      description: "Shows who is currently playing.  Give a nick to show only that player.",
      response: function(opt) {
        var self = this;
        if (opt.params.length === 0) {
          this.bot.dispatch('get_watchlist', function(watchlist) {
            opt.params.push(watchlist.join('|'));
            self.relay('Sequell', opt);
          });
        } else {
          self.relay('Sequell', opt);
        }
      }
    },
    "!log": {
      description: "Gives a URL to the user's last morgue file. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!mfcwc": {
      description: "New Sequell command to perform: !hs @mfc mfcwc | !nick mfc <nicks> | !kw mfcwc OpBe rstart>=201400270900 rend<=201401030900 | remember rstart/rend is in GMT",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!nchoice": {
      description: "Shows Nemelex's Choice.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "%rc": {
      description: "Gives a URL to the user's rc file.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!rng": {
      description: "Chooses randomly between its (space-separated) arguments. Accepts @god, @char, @role, and @race special arguments. Prefixing the special argument with 'good' or 'bad' limits the choices to only unrestricted or only restricted combos, respectively. @role=<role> or @race=<race> chooses a random combo with the specified role/race.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!streak": {
      description: "Show's a player's winning streak (or lack thereof).",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!ttr": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!ttyrec": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!tv": {
      description: "Usage: !tv <game>. Plays the game on FooTV.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },
    "!won": {
      description: "Shows the number of games won. Usage: !won <nick> [<number of wins to skip>]",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sequell', opt);
      }
    },
    "!wtf": {
      description: "Expands race/role abbreviations. Example usage: !wtf TrBe",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },

    // Henzell
    "!dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!time": {
      description: "Shows the UTC time on crawl.akrasiac.org.",
      response: function(opt) {
        this.relay('Henzell', opt);
      }
    },
    "!whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!players": {
      description: "Lists all players currently playing on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!version": {
      description: "List all game versions currently being hosted on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!watch": {
      description: "Display webtiles URL for user on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },

    // Gretell
    "@??": {
      no_space: true,
      description: "Usage: @?? <monster name>",
      response: function(opt) {
        this.relay('Gretell', opt);
      }
    },
    "@whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Gretell', opt);
      }
    },
    "@dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Gretell', opt);
      }
    },
    "@players": {
      description: "Lists all players currently playing on CDO. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Gretell', opt);
      }
    },
    "@version": {
      description: "List all game versions currently being hosted on CDO. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Gretell', opt);
      }
    },

    // Sizzell
    "%whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sizzell', opt);
      }
    },
    "%dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sizzell', opt);
      }
    },
    "%players": {
      description: "Lists all players currently playing on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sizzell', opt);
      }
    },
    "%version": {
      description: "List all game versions currently being hosted on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sizzell', opt);
      }
    },
    "%watch": {
      description: "Display webtiles URL for user on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Sizzell', opt);
      }
    },

    // Lantell
    "$whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Lantell', opt);
      }
    },
    "$dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Lantell', opt);
      }
    },
    "$players": {
      description: "Lists all players currently playing on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Lantell', opt);
      }
    },
    "$version": {
      description: "List all game versions currently being hosted on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Lantell', opt);
      }
    },
    "$watch": {
      description: "Display webtiles URL for user on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Lantell', opt);
      }
    },

    // Rotatell
      "^whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Rotatell', opt);
      }
    },
    "^dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Rotatell', opt);
      }
    },
    "^players": {
      description: "Lists all players currently playing on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Rotatell', opt);
      }
    },
    "^version": {
      description: "List all game versions currently being hosted on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Rotatell', opt);
      }
    },
    "^watch": {
      description: "Display webtiles URL for user on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Rotatell', opt);
      }
    }
  }
};
