"use strict";
var irc = require('irc');
var offer = require('offer');
var extend = require('extend');
var foreach = require('foreach');
var Promise = require('bluebird');

module.exports = {
  name: "crawl",
  prefix: "",

  // Listen for these nicks
  relay_bots: ['Sequell', 'Henzell', 'Gretell', 'Sizzell', 'Lantell', 'necKro', 'Rotatell', 'Rotatelljr'],
  // Max ms to wait for game info
  info_timeout: 10 * 1000,
  // Delay between game info requests
  info_retry_delay: 10 * 1000,
  // Max number of times to retry game info request
  info_retry_limit: 6,

  // IRC options
  relay_nick: 'OCTOTROG',
  relay_server: 'irc.freenode.net',
  relay_channel: '##crawl',

  parsers: [
    {
      event: 'player_death',
      regex: /^((\d+)(\/\d+)?(\. ))?(\[([^\]]+)\] )?(\w+) the ([\w ]+) \(L(\d\d?) (\w\w)(\w\w)\), (worshipper of ([\w ]+), )?(.+?)( [io]n (\w+(:\d\d?)?))?( \([^)]*\))?( on ([-0-9]+ [:0-9]+))?, with (\d+) points after (\d+) turns and ([^.]+)\.$/,
      mapping: {
        result_num: 2,
        extra_info: 6,
        player: 7,
        title: 8,
        xl: 9,
        race: 10,
        class: 11,
        god: 13,
        fate: 14,
        place: 16,
        date: 20,
        score: 21,
        turns: 22,
        duration: 23
      }
    }, {
      event: 'player_milestone',
      regex: /^([^(].*) \(L(\d\d?) (\w\w)(\w\w)\) (.*) \(([^)]*)\)$/,
      mapping: {
        player: 1,
        xl: 2,
        race: 3,
        class: 4,
        milestone: 5,
        place: 6
      }
    }, {
      event: 'player_morgue',
      regex: /^(\d+)(\/\d+)?\. (\w+), XL(\d\d?) (\w\w)(\w\w), T:(\d+): (http:\/\/.*)$/,
      mapping:  {
        result_num: 1,
        player: 3,
        xl: 4,
        race: 5,
        class: 6,
        turns: 7,
        morgue: 8
      }
    }, {
      event: 'player_morgue_failed',
      regex: /^No games for (\w+) \((\w\w)(\w\w) xl=(\d\d?) turns=(\d+) score=(\d+)\)\.$/,
      mapping: {
        player: 1,
        race: 2,
        class: 3,
        xl: 4,
        turns: 5,
        score: 6
      }
    }
  ],

  init: function() {
    var options = extend({}, this.bot.irc || {}, {
      channels: ['##crawl']
    });
    this.relay_nick = this.bot.relay_nick || this.bot.nick || 'OCTOTROG';
    this.relay_client = new irc.Client(this.relay_server, this.relay_nick, extend({}, this.bot.irc, { channels: [this.relay_channel] }));
    this.relay_client.addListener('message', function(nick, to, text, message) {
      if (this.relay_bots.indexOf(nick) === -1) return;
      this.emitP('crawl_event', text, nick, (to === this.bot.nick));
    }.bind(this));
    this.relay_client.addListener('error', function() {
      console.warn('relay client error:', arguments);
    });
  },

  destroy: function() {
    this.removeAllListeners();
    this.relay_client.disconnect();
  },

  relay: function(remote_bot, opt) {
    return this.relay_client.say(remote_bot, (opt.command + ' ' + opt.params.join(' ')).trim());
  },

  listeners: {
    'crawl_event': function(deferred, text, from, privmsg) {
      // Recieved a message from a bot!  Do something about it.
      var event, info = {
        text: text,
        from: from,
        privmsg: privmsg
      };

      // Check the parsers for first event match
      this.parsers.some(function(p) {
        var matches = text.match(p.regex);
        if (matches === null) return;
        event = p.event;
        foreach(p.mapping, function(i, n) {
          info[n] = matches[i];
        });
        return true;
      });

      if (event) {
        deferred.resolve(this.emitP(event, info));
      } else {
        // No event to dispatch!
        // Relay the text anyways if appropriate
        if (privmsg) this.say(false, '<%s> %s', from, text);
        deferred.reject();
      }
    },

    'get_gameinfo': function(deferred, info, query, info_type, retries) {
      retries = retries || 0;
      // Request the game info
      this.relay('Sequell', {
        command: '!lg',
        params: [
          info.player,
          info.race + info.class,
          'xl=' + info.xl,
          'turns=' + info.turns,
          'score=' + info.score,
          query
        ]
      });
      var promise = (this.queueExpect(info_type, info)
      .bind(this)
      .timeout(this.info_timeout)
      .catch(Promise.TimeoutError, function() {
        if (retries < this.info_retry_limit) {
          return (
            Promise.delay(this.info_retry_delay)
            .bind(this)
            .then(function() {
              return this.emitP('get_gameinfo', info, query, info_type, ++retries);
            })
          );
        } else {
          // Retry limit reached!
          this.say('Cannot retrieve additional info for player: %s', info.player);
        }
      }));
      deferred.resolve(promise);
      return promise;
    },

    'player_death': function(deferred, info) {
      // Check resolution queue
      if (this.queueCompare('player_death', info,
        ['player', 'race', 'class', 'xl', 'turns', 'score']
      )) return;

      // Check watchlist
      deferred.resolve(this.dispatch('check_watchlist', info.player)
      .bind(this)
      .then(function(watched) {
        // Relay death event to channel if appropriate
        if (watched || info.privmsg) {
          this.say(false, '<%s> %s', info.from, info.text);
        } else {
          // Stop event resolution, we don't care about this death event
          throw "Not giving a fuck.";
        }
        return Promise.all([
          this.emitP('get_gameinfo', info, '-log', 'player_morgue')
          .get('morgue'),
          this.emitP('get_gameinfo', info, 'x=src,gid,id,v', 'player_death')
          .get('extra_info')
          .then(function(v) {
              // Parse the extra info
              var out = {};
              v.split(';').forEach(function(e) {
                var p = e.split('=');
                if (p.length === 2) out[p[0]] = p[1];
              });
              return out;
            })
        ]);
      })
      .spread(function(morgue, extra_info) {
        extend(info, extra_info, { morgue: morgue });
        this.say(false,
          "server: %s; id: %s; version: %s; morgue: %s",
          info.src,
          info.id,
          info.v,
          info.morgue
        );
        // Log everything to the database
        this.dispatch('db_insert', 'deaths', info, ['id', 'server', 'score', 'player', 'race', 'class', 'title', 'god', 'place', 'fate', 'xl', 'turns', 'date', 'duration', 'morgue'])
        .bind(this)
        .catch(function(e) {
          this.say_phrase('database_error', e);
        });
      }));
    },

    'player_morgue': function(deferred, info) {
      if (this.queueCompare('player_morgue', info,
        ['player', 'race', 'class', 'xl', 'turns', 'score']
      )) return;
    },

    'player_milestone': function(deferred, info) {
      this.dispatch('check_watchlist', info.player)
      .bind(this)
      .then(function(watched) {
        if (watched || info.privmsg) {
          this.say(false, '<%s> %s', info.from, info.text);
        }
      });
      // TODO: check for ghost kills?
      // TODO: log milestones in database?
    }
  },

  commands: {
    // Sequell
    "!!": {
      no_space: true,
      description: "Pass arbitrary command to Sequell | !!hs . OpBe | Must use . for your nick",
      response: function(opt) {
        var actualcommand = '!' +  opt.params.join(' ');
        actualcommand = actualcommand.replace(' .', ' ' + opt.nick + ' ');
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
