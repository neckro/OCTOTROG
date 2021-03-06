"use strict";
var _ = require('lodash');
var irc = require('irc');
var format = require('util').format;
var Promise = require('bluebird');

module.exports = {
  name: "crawl",
  prefix: "",

  defaults: {
    // Max ms to wait for game info
    info_timeout: 60 * 1000,
    // Delay between game info requests
    info_retry_delay: 10 * 1000,
    // Max number of times to retry game info request
    info_retry_limit: 6,
    // Interval between cron runs
    cron_interval: 300 * 1000,
    // Minimum score required to tweet deaths
    tweet_score_min: 1000,
    // Stop listening for a particular relay hash after this long
    relay_timeout: 60 * 1000,
    // Bypass the watchlist (for testing)
    watchlist_bypass: false,
    // Colors
    milestone_color: '{cyan,black}',
    win_color: '{yellow,black}',
    death_color: '{light_red,black}',
    ghost_kill_color: '{light_magenta,black}',

    // Listen for these nicks
    relay_bots: {
      'neckro': {
        watch: '^watch'
      },
      'Sequell': {},
      'Postquell': {},
      'Cheibriados' : {},
      'Eksell': {
        code: 'cxc',
        watch: '|watch'
      },
      'Henzell': {
        code: 'cao',
        watch: '!watch'
      },
      'Gretell': {
        code: 'cdo'
      },
      'Sizzell': {
        code: 'cszo',
        watch: '%watch'
      },
      'Jorgrell': {
        code: 'cjr',
        watch: '=watch'
      },
      'Lantell': {
        code: 'clan',
        watch: '$watch'
      },
      'Rotatell': {
        code: 'cbro',
        watch: '^watch'
      },
      'Rotatelljr': {
        code: 'cbro+'
      },
      'Cbrotell': {
        code: 'cbr2'
      },
      'Cbrotelljr': {
        code: 'cbr2+'
      }
    }
  },

  parsers: [
    {
      event: 'player_death',
      regex: '^' +
        '((\\d+)(/\\d+)?(\\. ))?'       +// 147/150.
        '(\\[([^\\]]+)\\] )?'           +// [src=cszo;id=2613578;v=0.13.0]
        '(\\w+) the ([-\'\\w ]+) '      +// necKro23 the Ducker
        '\\(L(\\d\\d?) '                +// (L6
        '(\\w\\w)(\\w\\w)'              +// OpBe

        // Two different ways to show the religion, ugh:
        '(\\), worshipper)?'            +// ), worshipper
        '( of )?'                       +// of
        '([\\w ]+)?\\)?, '              +// Trog),

        '('                             +//(
        '(.*?(\\w+)\'s? ghost.*?)|'     +// slain by whoever's ghost
        '(.*?)'                         +// did whatever
        ')'                             +//)
        '( \\(kmap: ([\\w]+)\\))?'      +// (kmap: whatever)
        '( ([io]n) '                    +// on
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
        ghost_killer: 17,
        kmap: 20,
        preposition: 22,
        place: 23,
        vault: 26,
        date: 28,
        score: 29,
        turns: 30,
        duration: 31
      },
      tests: [
        "axxe the Warrior (L13 MiFi), worshipper of Okawaru, succumbed to a naga ritualist's toxic radiance in D (Sprint), with 28919 points after 3753 turns and 0:07:59.",
        "19/20. [src=cszo;game_key=neckro23:cszo:20130912023426S;id=2613578;v=0.13.0] neckro23 the Ducker (L6 OpBe of Trog), slain by an orc wizard (a +3,+2 orcish dagger) on D:3 on 2013-10-12 03:54:15, with 510 points after 2206 turns and 0:09:07.",
        "5. neckro23 the Cleaver (L12 MiBe of Trog), demolished by a death yak on Lair:5 (minmay_swamp_entry_wisps) on 2013-05-14 07:46:42, with 20426 points after 15217 turns and 1:07:08.",
        "4. TheNoid the Slayer (L27 VpNe of Kikubaaqudgha), blasted by a smoke demon (divine providence) (kmap: evilmike_mini_pan_T) in Pandemonium on 2014-03-17 21:47:41, with 763206 points after 112223 turns and 10:51:26.",
        "546. [piety=188] Kramin the Reanimator (L16 MuNe of Ashenzari), blasted by Kramin's illusion (dispel undead) (woven by Mara) on Spider:3 on 2014-11-10 00:05:49, with 115045 points after 40273 turns and 2:51:25.",
        "1. [id=3111623;v=0.15.0-a0] Runemage the Magician (L8 VSEn of Okawaru), succumbed to guido's ghost's poison on D:5 on 2014-04-08 21:54:18, with 1347 points after 7371 turns and 0:36:35."
      ]
    }, {
      event: 'player_milestone',
      regex: '^' +
        '((\\d+)(/\\d+)?(\\. ))?'             +// 660/661.
        '(\\[([-0-9]+ [:0-9]+)\\] )?'         +// [2013-10-12 03:53:52]
        '(\\[([^\\]]+)\\] )?'                 +// [src=cszo;v=0.13.0]
        '(\\w+) (the ([-\'\\w ]+) )?'         +// necKro23 the Ducker
        '\\(L(\\d\\d?) '                      +// (L6
        '(\\w\\w)(\\w\\w)'                    +// OpBe
        '( of ([\\w ]+))?'                    +// of Trog
        '\\) '                                +// )
        '(.*?)'                               +// killed Grinder
        '( on turn (\\d+))?[.!]? '            +// on turn 2190.
        '\\((\\w+(:\\d+)?( \\(Sprint\\))?)\\)'+// (D:3)
        '( \\[.*?\\])?'                       +// [CBRO 0.22.0]
        '$',
      mapping: {
        result_num: 2,
        date: 5,
        extra_info: 8,
        player: 9,
        title: 11,
        xl: 12,
        race: 13,
        class: 14,
        god: 16,
        milestone: 17,
        turn: 19,
        place: 20
      },
      tests: [
        "1/2. [2013-09-27 23:08:55] [src=cszo;v=0.13.0-b1] neckro23 the Chopper (L4 MiBe of Trog) killed the ghost of johnstein the Poker, a weakling MfBe of Trog on turn 1827. (D:3)",
        "27. [2013-10-12 03:53:52] [src=cszo;v=0.13.0] neckro23 the Ducker (L5 OpBe of Trog) killed Grinder on turn 2190. (D:3)",
        "axxe (L12 MiFi) killed Erica. (D (Sprint))",
        "necKro23 (L8 MiHu) killed the ghost of johnstein the Archer, an average CeHu of Nemelex Xobeh. (D:5)",
        "odiv (L24 CeHu) found a silver rune of Zot. (Vaults:5)",
        "19. [2014-04-03 21:07:26] TheNoid the Slayer (L27 CeHu of Okawaru) found the Orb of Zot! (Zot:5)",
        "150. [2014-04-03 20:27:52] TheNoid the Slayer (L26 CeHu of Okawaru) found an abyssal rune of Zot on turn 91126. (Abyss:3)",
        "odiv (L26 CeHu) reached level 5 of the Realm of Zot. (Zot:5)",
        "odiv (L26 CeHu) is cast into the Abyss! (ogre mage) (Vaults:1)"
      ]
    }, {
      event: 'player_morgue',
      regex: '^' +
        '(\\d+)(/\\d+)?\\. '            +// 660/661.
        '(\\w+), XL(\\d\\d?) '          +// necKro23, XL6
        '(\\w\\w)(\\w\\w), '            +// OpBe,
        'T:(\\d+): '                    +// T:2206:
        '(https?://.+)'                 +// http://dobrazupa.org/[...]
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
        "1. Kramin, XL16 MuNe, T:40273: https://crawl.project357.org/morgue/Kramin/morgue-Kramin-20141110-000549.txt",
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
    }, {
      event: 'player_webtiles',
      regex: '^Watch (\\w+) at: (https?://.+)$',
      mapping: {
        player: 1,
        webtiles: 2
      },
      tests: [
        "Watch necKro23 at: http://crawl.berotato.org:8080/#watch-necKro23"
      ]
    }
  ],

  init: function() {
    var irc_options = _.omit(this.config.irc || {}, ['channels']);
    var channels = this.channels = this.config.relay_from || this.config.irc.channels;

    this.relay_nick = this.config.relay_nick;
    this.relay_server = this.config.relay_server;
    var relay_client = this.relay_client = new irc.Client(
      this.relay_server,
      this.relay_nick,
      this.config.irc
    );
    var self = this;

    relay_client.addListener('registered', function(nick, to, text, message) {
      try {
        var secrets = require('../secrets');
        var password = secrets['password_freenet'];
        relay_client.say('NickServ', 'IDENTIFY ' + password);
      } catch(e) {
        // Forget it
      }
      // Wait to identify and then join channels
      setTimeout(function() {
        _.forEach(channels, function(channel) {
          setTimeout(function() {
            self.dispatch('log:debug', 'Joining relay channel:', channel);
            relay_client.join(channel);
          }, 1000);
        });
      }, 5000);
    });

    // Pass IRC message events
    this.relay_client.addListener('message', function(nick, to, text, message) {
      this.emitP('crawl_msg', nick, to, text, message);
    }.bind(this));

    this.relay_client.addListener('error', function(e) {
      this.dispatch('log:error', 'Relay client error', e);
    }.bind(this));

    this.cronTimer = setInterval(function() {
      this.emitP('cron_event');
    }.bind(this), this.config.cron_interval);
  },

  destroy: function() {
    clearInterval(this.cronTimer);
    this.removeAllListeners();
    this.relay_client.disconnect();
  },

  relay: function(remote_bot, msg) {
    var query = (msg.command + ' ' + msg.params.join(' ')).trim();
    // Use Sequell's !RELAY command if we can
    if (remote_bot === 'Sequell') {
      // Create a hash to match response to request
      var out_hash = (msg.from || this.relay_nick) + '_' + this.generate_hash(4);

      // Set up relay listeners, if there's someone to relay it to
      if (msg.from) {
        var relay_listener = function(evt, in_hash, message) {
          if (in_hash !== out_hash) return;
          msg.reply(message);
        };
        this.addListener('relay_msg', relay_listener);
        // Stop listening after a timeout
        setTimeout(function() {
          this.removeListener('relay_msg', relay_listener);
        }.bind(this), this.config.relay_timeout);
      }

      query = format(
        '!RELAY -nick %s -prefix |%s| %s',
        msg.from,
        out_hash,
        query
      );
    }
    this.dispatch('log:debug', 'Relaying to ' + remote_bot + ':', query);
    return this.relay_client.say(remote_bot, query);
  },

  relay_event: function(text, from) {
    var echo;
    var server = from && this.config.relay_bots[from] && this.config.relay_bots[from].code;
    if (typeof server === 'string') {
      echo = format('%s{reset} [%s]', text, server);
    } else {
      echo = text;
    }
    _.forEach(this.config.relay_to, function(channel) {
      this.dispatch('irc:cmd:saycolor', channel, echo);
    }, this);
  },

  parse_message: function(parsers, text) {
    // Check the parsers for first event match
    var event, info = {}, matches;
    parsers.some(function(p) {
      matches = text.match(p.regex);
      if (matches === null) return;
      event = p.event;
      _.forEach(p.mapping, function(i, n) {
        info[n] = matches[i];
      });
      return true;
    });
    return {
      event: event,
      info: info,
      matches: matches,
      text: text
    };
  },

  generate_hash: function(len) {
    // This is very simple and there is absolutely no check for hash
    // collisions, but in practice this is pretty unlikely.
    len = len || 10;
    var out = '';
    var chars = '0123456789abcdef';
    for (var i = 0; i < len; i++) {
      out += chars[(Math.random() * chars.length) | 0];
    }
    return out;
  },

  listeners: {
    'crawl_msg': function(evt, nick, to, text, message) {
      // Ignore if msg wasn't from a Crawl bot
      if (!this.config.relay_bots[nick]) return;

      if (to === this.relay_nick) {
        this.dispatch('log:debug', '<' + nick + '>', text);
        if (nick === 'Sequell') {
          // Check for relay hash
          var matches = text.match(/^\|(.+?)\|(.+)$/);
          var hash = matches[1];
          // Remove hash from text for further processing
          text = matches[2];
          this.emitP('relay_msg', hash, text);
        } else {
          // Relay all privmsgs from other bots
          this.relay_event(text, nick);
        }
      }
      var parsed = this.parse_message(this.parsers, text);
      if (!parsed.event) return;

      this.dispatch('log:debug', 'Detected Crawl event:', parsed.event);
      _.extend(parsed.info, {
        text: text,
        from: nick
      });
      return evt.resolve(this.emitP(parsed.event, parsed.info));
    },

    'get_gameinfo': function(evt, info, query, info_type) {
      if (info.retries_left === undefined) info.retries_left = this.config.info_retry_limit;
      info_type = info_type || 'game_info';
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
      var promise = (this.queueExpectKeys(
        info_type,
        info,
        ['player', 'race', 'class', 'xl', 'turns']
      )
      .timeout(this.config.info_timeout)
      .catch(Promise.TimeoutError, function(e) {
        if (info.retries_left-- > 0) {
          // Try again
          return (
            Promise.delay(this.config.info_retry_delay)
            .bind(this)
            .then(function() {
              return this.emitP('get_gameinfo', info, query, info_type);
            })
          );
        } else {
          // Retry limit reached
          this.dispatch('log:error', 'Cannot retrieve additional info for player', info.player);
          throw e;
        }
      }));
      evt.resolve(promise);
    },

    'get_extra_info': function(evt, info) {
      evt.resolve(
        Promise.all([
          this.emitP('get_gameinfo', info, '-log', 'player_morgue')
          .get('morgue'),
          this.emitP('get_gameinfo', info, 'x=src,gid,id,v', 'player_death')
          .get('extra_info')
          .then(function(v) {
            // Parse the extra info
            if (typeof v !== 'string') throw 'get_extra_info: Bad info obtained!';
            var out = {};
            _.forEach(v.split(';'), function(e) {
              var p = e.split('=');
              if (p.length === 2) out[p[0]] = p[1];
            });
            return out;
          })
        ])
        .spread(function(morgue, extra_info) {
          _.extend(info, {
            id: extra_info.id,
            server: extra_info.src,
            version: extra_info.v,
            morgue: morgue
          });
          return info;
        })
      );
    },

    'get_webtiles': function(evt, info) {
      var watchcmd = info.from && this.config.relay_bots[info.from] && this.config.relay_bots[info.from].watch;
      if (!watchcmd) return evt.resolve(info);
      this.relay(info.from, {
        command: watchcmd,
        params: [
          info.player
        ]
      });
      evt.resolve(
        this.queueExpectKeys('webtiles', info, ['player'])
        .timeout(this.config.info_timeout)
        .catch(Promise.TimeoutError, evt.resolve)
        .then(function(w) {
          if (typeof w === 'object') info.webtiles = w.webtiles;
          return info;
        })
      );
    },

    'log_death': function(evt, info) {
      evt.resolve(
        this.dispatch('db:insert', 'deaths', info, ['id', 'server', 'version', 'score', 'player', 'race', 'class', 'title', 'god', 'place', 'fate', 'xl', 'turns', 'date', 'duration', 'morgue'])
        .catch(function(e) {
          this.dispatch('log:error', 'log_death: database error', e);
        })
      );
    },

    'player_death': function(evt, info) {
      if (this.queueResolve('player_death', info)) return;
      var bypass = this.config.watchlist_bypass;
      // Check for both watched player deaths and ghost kills
      var p = Promise.all([
        !bypass && info.player && this.dispatch('check_watchlist', info.player),
        !bypass && info.ghost_killer && this.dispatch('check_watchlist', info.ghost_killer)
      ]).bind(this);

      evt.resolve(p.spread(function(watched, ghost) {
        info.watched = watched;
        if (!bypass) {
          if (!watched && !ghost) return;
          // Log it in the DB
          this.emitP('log_death', info);
        }
        // If this wasn't a fresh death, we're done here
        if (info.result_num) return;

        // Echo to main channel
        var color = '';
        if (info.fate && info.fate.match(/^escaped/)) {
          color = this.config.win_color;
        } else if (watched) {
          color = this.config.death_color;
        } else if (ghost) {
          color = this.config.ghost_kill_color;
        }
        this.relay_event(color + info.text, info.from);

        // If score is above threshold, tweet it (crawl.twitter plugin)
        if (info.score > this.config.tweet_score_min) {
          this.emitP('get_extra_info', info)
          .then(function(info) {
            this.dispatch('tweet:death', info);
          });
          // Need to get morgue before this happens
        }
      }));
    },

    'player_milestone': function(evt, info) {
      if (typeof info.milestone !== 'string') return;
      var match;
      // check for ghost kill
      match = info.milestone.match(/(killed the ghost of (\w+))?(killed (.+))?/);
      if (match) {
        info.ghost_kill = match[2];
        info.unique_kill = match[4];
      }
      // check for rune/Orb
      match = info.milestone.match(/found (an? (\w+) rune)?(the Orb)? of Zot/);
      if (match) {
        info.rune = match[2] || 'orb';
      }

      var p = Promise.all([
        info.player && this.dispatch('check_watchlist', info.player),
        info.ghost_kill && this.dispatch('check_watchlist', info.ghost_kill)
      ]).bind(this);

      evt.resolve(p.spread(function(watched, ghost) {
        if (!watched && !ghost) return;
        // If this wasn't a fresh milestone, we're done here
        if (info.result_num) return;

        // Echo to main channel
        var color = info.result_num ? '' : this.config.milestone_color;
        this.relay_event(color + info.text, info.from);

        // Send rune milestones to twitter plugin
        if (info.rune) {
          this.emitP('get_webtiles', info)
          .then(function(info) {
            this.dispatch('tweet:milestone', info);
          });
        }
      }));
    },

    'player_morgue': function(evt, info) {
      if (this.queueResolve('player_morgue', info)) return;
    },

    'player_webtiles': function(evt, info) {
      if (this.queueResolve('webtiles', info)) return;
    },

    'cron_event': function(evt) {
      return;
      evt.resolve(
        this.dispatch('db:call', 'all', 'SELECT * FROM deaths WHERE id IS NULL ORDER BY score DESC LIMIT 1')
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
      response: function(evt, msg) {
        msg.command = '!' + (msg.params.shift() || '');
        this.relay('Sequell', msg);
      }
    },
    "&&": {
      no_space: true,
      description: "Pass an arbitrary command to Sequell: &&rc . ",
      response: function(evt, msg) {
        msg.command = '&' + (msg.params.shift() || '');
        this.relay('Sequell', msg);
      }
    },
    "???": {
      no_space: true,
      description: "Alias for !!readall.",
      response: function(evt, msg) {
        msg.command = '!readall';
        // omg
        msg.params = [msg.params.join('_')];
        this.relay('Sequell', msg);
      }
    },
    "??": {
      no_space: true,
      description: "Look up or search for an entry in LearnDB",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "r??": {
      no_space: true,
      description: "Return random entry in LearnDB.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "?/": {
      no_space: true,
      description: "Search for an entry in LearnDB.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!abyss": {
      description: "Use with caution.",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sequell', msg);
      }
    },
    "!apt": {
      description: "Looks up aptitudes for specified race/skill combination.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!chars": {
      description: "Lists the frequency of all character types a player started.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!ftw": {
      description: "Abbreviates race/role abbreviations. Example usage: !ftw Troll Berserker",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!gamesby": {
      description: "Summarizes a player's public server career.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!gkills": {
      description: "Lists the top kills for a player's ghost.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!greatplayer": {
      description: "Shows a player's unwon species.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!greaterplayer": {
      description: "Shows a player's unwon backgrounds.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!hs": {
      description: "Lists the highest-scoring game for a player.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!killratio": {
      description: "Usage: !killratio <unique monster> (<player>)",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!kw": {
      description: "Define keyword: `!kw <keyword> <definition>` to define, `!kw -rm <keyword>` to delete, `!kw <keyword>` to query, `!kw -ls` to list.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!lairratio": {
      description: "Shows how often a player reaches the Lair.",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sequell', msg);
      }
    },
    "!lg": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !lg (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!listgame": {
      description: "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !listgame (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!lm": {
      description: "Lists milestones for the specified player. Usage: !lm (<player>) (<number>) (options) where options are in the form field=value, or (max|min)=field. See ??milestone for more info.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!locateall": {
      description: "Shows who is currently playing.  Give a nick to show only that player.",
      response: function(evt, msg) {
        var self = this;
        if (msg.params.length === 0) {
          this.dispatch('get_watchlist', function(watchlist) {
            msg.params.push(watchlist.join('|'));
            self.relay('Sequell', msg);
          });
        } else {
          self.relay('Sequell', msg);
        }
      }
    },
    "!log": {
      description: "Gives a URL to the user's last morgue file. Accepts !listgame style selectors.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!mfcwc": {
      description: "New Sequell command to perform: !hs @mfc mfcwc | !nick mfc <nicks> | !kw mfcwc OpBe rstart>=201400270900 rend<=201401030900 | remember rstart/rend is in GMT",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!nchoice": {
      description: "Shows Nemelex's Choice.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "%rc": {
      description: "Gives a URL to the user's rc file.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!rng": {
      description: "Chooses randomly between its (space-separated) arguments. Accepts @god, @char, @role, and @race special arguments. Prefixing the special argument with 'good' or 'bad' limits the choices to only unrestricted or only restricted combos, respectively. @role=<role> or @race=<race> chooses a random combo with the specified role/race.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!streak": {
      description: "Show's a player's winning streak (or lack thereof).",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!ttr": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!ttyrec": {
      description: "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!tv": {
      description: "Usage: !tv <game>. Plays the game on FooTV.",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!won": {
      description: "Shows the number of games won. Usage: !won <nick> [<number of wins to skip>]",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!wtf": {
      description: "Expands race/role abbreviations. Example usage: !wtf TrBe",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    "!time": {
      description: "Shows the time until the tournament starts or ends",
      response: function(evt, msg) {
        this.relay('Sequell', msg);
      }
    },
    ".echo": {
      description: "Echos back the argument, possibly including command line expansions.  See https://github.com/crawl/sequell/blob/master/docs/commandline.md for documentation.",
      response: function(opt) {
        this.relay('Sequell', opt);
      }
    },

    // Henzell
    "!dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.akrasiac.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Henzell', msg);
      }
    },
    "!whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.akrasiac.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Henzell', msg);
      }
    },
    "!players": {
      description: "Lists all players currently playing on CAO. (crawl.akrasiac.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Henzell', msg);
      }
    },
    "!version": {
      description: "List all game versions currently being hosted on CAO. (crawl.akrasiac.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Henzell', msg);
      }
    },
    "!watch": {
      description: "Display webtiles URL for user on CAO. (crawl.akrasiac.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Henzell', msg);
      }
    },
    // Cheibriados
    "%%": {
      no_space: true,
      description: "Pass an arbitrary command to Sequell: !!hs . OpBe",
      response: function(evt, msg) {
        var i = msg.params.indexOf('.');
        if (i > -1) msg.params[i] = msg.from;
        msg.command = '%' + (msg.params.shift() || '');
        this.relay('Cheibriados', msg);
      }
    },
    "%??": {
      no_space: true,
      description: "Look up an entry in LearnDB.",
      response: function(evt, msg) {
        this.relay('Cheibriados', msg);
      }
    },
    // Gretell
    "@??": {
      no_space: true,
      description: "Usage: @?? <monster name>",
      response: function(evt, msg) {
        this.relay('Gretell', msg);
      }
    },
    "@whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.develz.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Gretell', msg);
      }
    },
    "@dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.develz.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Gretell', msg);
      }
    },
    "@players": {
      description: "Lists all players currently playing on CDO. (crawl.develz.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Gretell', msg);
      }
    },
    "@version": {
      description: "List all game versions currently being hosted on CDO. (crawl.develz.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Gretell', msg);
      }
    },

    // Sizzell
    "%whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.s-z.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sizzell', msg);
      }
    },
    "%dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.s-z.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sizzell', msg);
      }
    },
    "%players": {
      description: "Lists all players currently playing on CSZO. (crawl.s-z.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sizzell', msg);
      }
    },
    "%version": {
      description: "List all game versions currently being hosted on CSZO. (crawl.s-z.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sizzell', msg);
      }
    },
    "%watch": {
      description: "Display webtiles URL for user on CSZO. (crawl.s-z.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Sizzell', msg);
      }
    },

    // Jorgrell
    "=whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.jorgrun.rocks)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Jorgrell', msg);
      }
    },
    "=dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.jorgrun.rocks)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Jorgrell', msg);
      }
    },
    "=players": {
      description: "Lists all players currently playing on CJR. (crawl.jorgrun.rocks)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Jorgrell', msg);
      }
    },
    "=version": {
      description: "List all game versions currently being hosted on CJR. (crawl.jorgrun.rocks)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Jorgrell', msg);
      }
    },
    "=watch": {
      description: "Display webtiles URL for user on CJR. (crawl.jorgrun.rocks)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Jorgrell', msg);
      }
    },

    // Lantell
    "$whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.lantea.net)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Lantell', msg);
      }
    },
    "$dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.lantea.net)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Lantell', msg);
      }
    },
    "$players": {
      description: "Lists all players currently playing on CLAN. (crawl.lantea.net)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Lantell', msg);
      }
    },
    "$version": {
      description: "List all game versions currently being hosted on CLAN. (crawl.lantea.net)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Lantell', msg);
      }
    },
    "$watch": {
      description: "Display webtiles URL for user on CLAN. (crawl.lantea.net)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Lantell', msg);
      }
    },

    // Rotatell
      "^whereis": {
      description: "Lists where a player currently is in the dungeon. (crawl.berotato.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Rotatell', msg);
      }
    },
    "^dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.berotato.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Rotatell', msg);
      }
    },
    "^players": {
      description: "Lists all players currently playing on CBRO. (crawl.berotato.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Rotatell', msg);
      }
    },
    "^version": {
      description: "List all game versions currently being hosted on CBRO. (crawl.berotato.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Rotatell', msg);
      }
    },
    "^watch": {
      description: "Display webtiles URL for user on CBRO. (crawl.berotato.org)",
      response: function(evt, msg) {
        if (msg.params.length === 0) msg.params.push(msg.from);
        this.relay('Rotatell', msg);
      }
    }
  }
};
