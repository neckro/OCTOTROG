"use strict";
var irc = require('irc');
var extend = require('extend');
var foreach = require('foreach');
var Promise = require('bluebird');

module.exports = {
  name: "crawl",
  prefix: "",

  // Listen for these nicks
  relay_bots: {
    'Sequell': true,
    'Cheibriados' : true,
    'Henzell': 'cao',
    'Gretell': 'cdo',
    'Sizzell': 'cszo',
    'Lantell': 'clan',
    'Rotatell': 'cbro',
    'Rotatelljr': 'cbro+'
  },
  // Max ms to wait for game info
  info_timeout: 60 * 1000,
  // Delay between game info requests
  info_retry_delay: 10 * 1000,
  // Max number of times to retry game info request
  info_retry_limit: 6,
  cron_interval: 60 * 1000,

  // IRC options
  relay_nick: 'OCTOTROG',
  relay_server: 'chat.freenode.net',
  relay_channels: ['##crawl', '#octolog'],

  parsers: [
    {
      event: 'player_death',
      regex: '^' +
        '((\\d+)(/\\d+)?(\\. ))?'       +// 147/150. 
        '(\\[([^\\]]+)\\] )?'           +// [src=cszo;id=2613578;v=0.13.0]
        '(\\w+) the ([\\w ]+) '         +// necKro23 the Ducker
        '\\(L(\\d\\d?) '                +// (L6
        '(\\w\\w)(\\w\\w)'              +// OpBe

        // Two different ways to show the religion, ugh:
        '(\\), worshipper)?'            +// ), worshipper
        '( of )?'                       +// of
        '([\\w ]+)?\\)?, '              +// Trog), 

        '(.+?)'                         +// slain by an orc wizard
        '( \\(kmap: ([\\w]+)\\))?'      +// (kmap: whatever)
        '( [io]n '                      +// on 
        '(\\w+(:?\\d?\\d?)?))?'         +// D:3 
        '( \\(([^)]*)\\))?'             +// (vault_name) 
        '( on ([-0-9]+ [:0-9]+))?, '    +// on 2013-10-12 03:54:15, 
        'with (\\d+) points? after '    +// with 510 points after
        '(\\d+) turns? and ([^.]+)\\.'  +// 2206 turns and 0:09:07.
        '$',
      mapping: {
        result_num: 2,
        extra_info: 6,
        player: 7,
        title: 8,
        xl: 9,
        race: 10,
        class: 11,
        god: 14,
        fate: 15,
        kmap: 17,
        place: 19,
        vault: 22,
        date: 24,
        score: 25,
        turns: 26,
        duration: 27
      },
      tests: [
        "axxe the Warrior (L13 MiFi), worshipper of Okawaru, succumbed to a naga ritualist's toxic radiance in D (Sprint), with 28919 points after 3753 turns and 0:07:59.",
        "19/20. [src=cszo;game_key=neckro23:cszo:20130912023426S;id=2613578;v=0.13.0] neckro23 the Ducker (L6 OpBe of Trog), slain by an orc wizard (a +3,+2 orcish dagger) on D:3 on 2013-10-12 03:54:15, with 510 points after 2206 turns and 0:09:07.",
        "5. neckro23 the Cleaver (L12 MiBe of Trog), demolished by a death yak on Lair:5 (minmay_swamp_entry_wisps) on 2013-05-14 07:46:42, with 20426 points after 15217 turns and 1:07:08.",
        "4. TheNoid the Slayer (L27 VpNe of Kikubaaqudgha), blasted by a smoke demon (divine providence) (kmap: evilmike_mini_pan_T) in Pandemonium on 2014-03-17 21:47:41, with 763206 points after 112223 turns and 10:51:26."
      ]
    }, {
      event: 'player_milestone',
      regex: '^' +
        '((\\d+)(/\\d+)?(\\. ))?'       +// 660/661. 
        '(\\[([-0-9]+ [:0-9]+)\\] )?'   +// [2013-10-12 03:53:52] 
        '(\\[([^\\]]+)\\] )?'           +// [src=cszo;v=0.13.0] 
        '(\\w+) (the ([\\w ]+) )?'      +// necKro23 the Ducker 
        '\\(L(\\d\\d?) '                +// (L6
        '(\\w\\w)(\\w\\w)'              +// OpBe
        '( of ([\\w ]+))?'              +// of Trog
        '\\) '                          +// ) 
        '(.*?)\\.? '                    +// killed Grinder on turn 2190. 
        '\\((.+( \\(Sprint\\))?)\\)'    +// (D:3)
        '$',
      mapping: {
        result_num: 2,
        date: 5,
        extra_info: 7,
        player: 9,
        title: 11,
        xl: 12,
        race: 13,
        class: 14,
        god: 16,
        milestone: 17,
        place: 18
      },
      tests: [
        "27. [2013-10-12 03:53:52] [src=cszo;v=0.13.0] neckro23 the Ducker (L5 OpBe of Trog) killed Grinder on turn 2190. (D:3)",
        "axxe (L12 MiFi) killed Erica. (D (Sprint))"
      ]
    }, {
      event: 'player_morgue',
      regex: '^' +
        '(\\d+)(/\\d+)?\\. '            +// 660/661. 
        '(\\w+), XL(\\d\\d?) '          +// necKro23, XL6 
        '(\\w\\w)(\\w\\w), '            +// OpBe, 
        'T:(\\d+): '                    +// T:2206: 
        '(http://.*)'                   +// http://dobrazupa.org/[...]
        '$',
      mapping:  {
        result_num: 1,
        player: 3,
        xl: 4,
        race: 5,
        class: 6,
        turns: 7,
        morgue: 8
      },
      tests: [
        "19/20. neckro23, XL6 OpBe, T:2206: http://dobrazupa.org/morgue/neckro23/morgue-neckro23-20131012-035415.txt"
      ]
    }, {
      event: 'player_morgue_failed',
      regex: '^' +
        'No games for (\\w+) '          +// No games for neckro23 
        '\\((\\w\\w)(\\w\\w) '          +// (OpBe 
        'xl=(\\d\\d?) '                 +// xl=6 
        'turns=(\\d+) '                 +// turns=2206
        'score=(\\d+)\\)\\.'            +// score=500).
        '$',
      mapping: {
        player: 1,
        race: 2,
        class: 3,
        xl: 4,
        turns: 5,
        score: 6
      },
      tests: [
        "No games for neckro23 (OpBe xl=6 turns=2207 score=500)."
      ]
    }
  ],

  init: function() {
    var options = extend({}, this.bot.irc || {}, {
      channels: ['##crawl']
    });
    this.relay_nick = this.bot.relay_nick || this.bot.nick || 'OCTOTROG';
    this.relay_client = new irc.Client(this.relay_server, this.relay_nick, extend({}, this.bot.irc, { channels: this.relay_channels }));
    this.relay_client.addListener('message', function(nick, to, text, message) {
      if (!this.relay_bots[nick]) return;
      this.emitP('crawl_event', text, nick, (to === this.bot.nick));
    }.bind(this));
    this.relay_client.addListener('error', function() {
      console.warn('relay client error:', arguments);
    });

    this.cronTimer = setInterval(function() {
      this.emitP('cron_event');
    }.bind(this), this.cron_interval);
  },

  destroy: function() {
    clearInterval(this.cronTimer);
    this.removeAllListeners();
    this.relay_client.disconnect();
  },

  relay: function(remote_bot, opt) {
    return this.relay_client.say(remote_bot, (opt.command + ' ' + opt.params.join(' ')).trim());
  },

  relay_response: function(text, from) {
    var echo = text;
    var server = from && this.relay_bots[from];
    if (typeof server === 'string') echo += ' [' + server + ']';
    this.say(false, echo);
  },

  parse_message: function(parsers, text) {
    // Check the parsers for first event match
    var event, info = {};
    parsers.some(function(p) {
      var matches = text.match(p.regex);
      if (matches === null) return;
      event = p.event;
      foreach(p.mapping, function(i, n) {
        info[n] = matches[i];
      });
      return true;
    });
    return { event: event, info: info };
  },

  listeners: {
    'crawl_event': function(deferred, text, from, privmsg) {
      // Recieved a message from a bot!  Do something about it.
      var parsed = this.parse_message(this.parsers, text);

      if (parsed.event) {
        extend(parsed.info, {
          text: text,
          from: from,
          privmsg: privmsg
        });
        console.log('Detected Crawl event: ', parsed.event);
        deferred.resolve(this.emitP(parsed.event, parsed.info));
      } else {
        // No event to dispatch!
        // Relay the text anyways if appropriate
        if (privmsg) this.relay_response(text);
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
    },

    'get_extra_info': function(deferred, info) {
      deferred.resolve(
        Promise.all([
          this.emitP('get_gameinfo', info, '-log', 'player_morgue')
          .get('morgue'),
          this.emitP('get_gameinfo', info, 'x=src,gid,id,v', 'player_death')
          .get('extra_info')
          .then(function(v) {
            // Parse the extra info
            if (typeof v !== 'string') throw 'get_extra_info: Bad info obtained!';
            var out = {};
            v.split(';').forEach(function(e) {
              var p = e.split('=');
              if (p.length === 2) out[p[0]] = p[1];
            });
            return out;
          })
        ])
        .spread(function(morgue, extra_info) {
          extend(info, {
            id: extra_info.id,
            server: extra_info.src,
            version: extra_info.v,
            morgue: morgue
          });
          return info;
        })
      );
    },

    'log_death': function(deferred, info) {
      deferred.resolve(
        this.dispatch('db_insert', 'deaths', info, ['id', 'server', 'version', 'score', 'player', 'race', 'class', 'title', 'god', 'place', 'fate', 'xl', 'turns', 'date', 'duration', 'morgue'])
        .catch(function(e) {
          console.log('log_death: database error', e);
          this.say_phrase('database_error', e);
        })
      );
    },

    'player_death': function(deferred, info) {
      // Check resolution queue
      if (this.queueCompare('player_death', info,
        ['player', 'race', 'class', 'xl', 'turns', 'score']
      )) return;

      // Check watchlist
      deferred.resolve(
        this.dispatch('check_watchlist', info.player)
        .then(function(watched) {
          info.watched = watched;   
          // Relay death event to channel if appropriate
          if (info.watched || info.privmsg) {
            this.relay_response(info.text, info.from);
            var p = this.emitP('get_extra_info', info);
            if (info.watched) {
              p.then(function(v) {
                this.emitP('log_death', info);
                return v;
              });
            }
            return p;
          }
          // Necessary to throw here?
          throw "Not giving a fuck.";
        })
        .then(function(info) {
          this.say(false,
            "server: %s; id: %s; version: %s; morgue: %s",
            info.server,
            info.id,
            info.version,
            info.morgue
          );
        })
      );
    },

    'player_morgue': function(deferred, info) {
      if (this.queueCompare('player_morgue', info,
        ['player', 'race', 'class', 'xl', 'turns', 'score']
      )) return;

      if (info.privmsg) this.say(false, info.text);
    },

    'player_milestone': function(deferred, info) {
      this.dispatch('check_watchlist', info.player)
      .then(function(watched) {
        if (watched || info.privmsg) {
          this.relay_response(info.text, info.from);
        }
      });
      // TODO: check for ghost kills?
      // TODO: log milestones in database?
    },

    'cron_event': function(deferred) {
      deferred.resolve(
        this.dispatch('db_call', 'all', 'SELECT * FROM deaths WHERE id IS NULL ORDER BY score DESC LIMIT 1')
        .then(function(res) {
          if (res && res[0]) {
            return this.emitP('get_extra_info', res[0]);
          } else {
            throw 'cron_event: database query error!';
          }
        })
        .then(function(info) {
          return this.emitP('log_death', info);
        })
      );
    }
  },

  commands: {
    // Sequell
    "!!": {
      no_space: true,
      description: "Pass an arbitrary command to Sequell: !!hs . OpBe",
      response: function(opt) {
        var i = opt.params.indexOf('.');
        if (i > -1) opt.params[i] = opt.from;
        opt.command = '!' + (opt.params.shift() || '');
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
    "r??": {
      no_space: true,
      description: "Return random entry in LearnDB.",
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!gkills": {
      description: "Lists the top kills for a player's ghost.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!greatplayer": {
      description: "Shows a player's unwon species.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!greaterplayer": {
      description: "Shows a player's unwon backgrounds.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!hs": {
      description: "Lists the highest-scoring game for a player.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!killratio": {
      description: "Usage: !killratio <unique monster> <player>",
      response: function(opt) {
        if (opt.params.length < 2) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!kw": {
      description: "Define keyword: `!kw <keyword> <definition>` to define, `!kw -rm <keyword>` to delete, `!kw <keyword>` to query, `!kw -ls` to list.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!lairratio": {
      description: "Shows how often a player reaches the Lair.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!lg": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !lg (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!listgame": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !listgame (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!lm": {
      description: "Lists milestones for the specified player. Usage: !lm (<player>) (<number>) (options) where options are in the form field=value, or (max|min)=field. See ??milestone for more info.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!ttr": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sequell', opt);
      }
    },
    "!ttyrec": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Henzell', opt);
      }
    },
    "!players": {
      description: "Lists all players currently playing on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Henzell', opt);
      }
    },
    "!version": {
      description: "List all game versions currently being hosted on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Henzell', opt);
      }
    },
    "!watch": {
      description: "Display webtiles URL for user on CAO. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Henzell', opt);
      }
    },
    // Cheibriados
    "%%": {
      no_space: true,
      description: "Pass an arbitrary command to Sequell: !!hs . OpBe",
      response: function(opt) {
        var i = opt.params.indexOf('.');
        if (i > -1) opt.params[i] = opt.from;
        opt.command = '%' + (opt.params.shift() || '');
        this.relay('Cheibriados', opt);
      }
    },
    "%??": {
      no_space: true,
      description: "Look up an entry in LearnDB.",
      response: function(opt) {
        this.relay('Cheibriados', opt);
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
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Gretell', opt);
      }
    },
    "@dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Gretell', opt);
      }
    },
    "@players": {
      description: "Lists all players currently playing on CDO. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Gretell', opt);
      }
    },
    "@version": {
      description: "List all game versions currently being hosted on CDO. (crawl.develz.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Gretell', opt);
      }
    },

    // Sizzell
    "%whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sizzell', opt);
      }
    },
    "%dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sizzell', opt);
      }
    },
    "%players": {
      description: "Lists all players currently playing on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sizzell', opt);
      }
    },
    "%version": {
      description: "List all game versions currently being hosted on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sizzell', opt);
      }
    },
    "%watch": {
      description: "Display webtiles URL for user on CSZO. (crawl.s-z.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Sizzell', opt);
      }
    },

    // Lantell
    "$whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Lantell', opt);
      }
    },
    "$dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Lantell', opt);
      }
    },
    "$players": {
      description: "Lists all players currently playing on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Lantell', opt);
      }
    },
    "$version": {
      description: "List all game versions currently being hosted on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Lantell', opt);
      }
    },
    "$watch": {
      description: "Display webtiles URL for user on CLAN. (crawl.lantea.net)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Lantell', opt);
      }
    },

    // Rotatell
      "^whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Rotatell', opt);
      }
    },
    "^dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Rotatell', opt);
      }
    },
    "^players": {
      description: "Lists all players currently playing on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Rotatell', opt);
      }
    },
    "^version": {
      description: "List all game versions currently being hosted on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Rotatell', opt);
      }
    },
    "^watch": {
      description: "Display webtiles URL for user on CBRO. (crawl.berotato.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.from);
        this.relay('Rotatell', opt);
      }
    }
  }
};
