"use strict";

module.exports = {
  name: "crawl",
  prefix: "",
  commands: {
    // Sequell
    "!chars": {
      description: "Lists the frequency of all character types a player started.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
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
        if (opt.params.length < 2) opt.params.unshift(opt.nick);
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
        if (opt.params.length === 0) opt.params.push(this.get_watchlist().join('|'));
        this.relay('Sequell', opt);
      }
    },
    "!log": {
      description: "Gives a URL to the user's last morgue file. Accepts !listgame style selectors.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
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

    // Henzell
    "??": {
      no_space: true,
      description: "Look up an entry in LearnDB.",
      response: function(opt) {
        this.relay('Henzell', opt);
      }
    },
    "!abyss": {
      description: "Use with caution.",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!apt": {
      description: "Looks up aptitudes for specified race/skill combination.",
      response: function(opt) {
        this.relay('Henzell', opt);
      }
    },
    "!dump": {
      description: "Gives an URL to the specified user's last character dump. (crawl.akrasiac.org)",
      response: function(opt) {
        if (opt.params.length === 0) opt.params.push(opt.nick);
        this.relay('Henzell', opt);
      }
    },
    "!ftw": {
      description: "Abbreviates race/role abbreviations. Example usage: !ftw Troll Berserker",
      response: function(opt) {
        this.relay('Henzell', opt);
      }
    },
    "!rng": {
      description: "Chooses randomly between its (space-separated) arguments. Accepts @god, @char, @role, and @race special arguments. Prefixing the special argument with 'good' or 'bad' limits the choices to only unrestricted or only restricted combos, respectively. @role=<role> or @race=<race> chooses a random combo with the specified role/race.",
      response: function(opt) {
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
    "!wtf": {
      description: "Expands race/role abbreviations. Example usage: !wtf TrBe",
      response: function(opt) {
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
    }
  },

  relay: function(remote_bot, opt) {
    opt.params.unshift(opt.action);
    // TODO: make msg relaying work again
    this.bot.relay_client.say(remote_bot, opt.params.join(' '));
  },

  get_watchlist: function() {
    var plugin = this.bot.get_plugin('watchlist');
    if (!plugin || typeof plugin.get_watchlist !== 'function') return [];
    return plugin.get_watchlist() || [];
  },

  check_watchlist: function(text) {
    // strip number from beginning
    text = text.toLowerCase().replace(/^[0-9]*\. /, '');

    return this.get_watchlist().some(function(nick) {
      nick = nick.toString().toLowerCase();
      if (text.indexOf(nick + ' ') === 0) return true;
      if (text.indexOf(nick + "'s ghost") > -1) return true;
      if (text.indexOf('the ghost of ' + nick) > -1) return true;
    });
  },

  relay_listener: function(nick, to, text) {
    // was message sender a watched relay bot?
    if ([
      'Sequell', 'Henzell', 'Gretell', 'Sizzell'
    ].indexOf(nick) === -1) return;

    if (to === this.bot.relay_nick || this.check_watchlist(text)) {
      this.bot.main_client.say(this.bot.main_channel, text);
    }
  }
};
