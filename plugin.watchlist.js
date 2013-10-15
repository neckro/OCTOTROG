"use strict";

module.exports = {
  name: "watchlist",
  prefix: "!",
  commands: {
    "watch": {
      description: "Watch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        if (this.check_watched_nick(nick)) {
          this.bot.say_phrase(opt.reply, 'watched_already', nick);
        } else if (this.modify_watchlist(nick, true)) {
          this.bot.say_phrase(opt.reply, 'watch_added', nick);
        } else {
          // TODO: error
        }
        // todo
      }
    },
    "unwatch": {
      description: "Unwatch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        if (!this.check_watched_nick(nick)) {
          this.bot.say_phrase(opt.reply, 'unwatched_already', nick);
        } else if (this.modify_watchlist(nick, false)) {
          this.bot.say_phrase(opt.reply, 'watch_removed', nick);
        } else {
          // TODO: error
        }
      }
    },
    "watched": {
      description: "Show list of watched users.",
      response: function(opt) {
        var watchtext = 'nobody';
        var watchlist = this.get_watchlist();
        if (watchlist) watchtext = watchlist.join(' ');
        this.bot.say_phrase(opt.reply, 'watched', watchtext);
      }
    }
  },

  check_watched_nick: function(key) {
    var list = this.get_watchlist();
    return (list && list.indexOf(key.toLowerCase()) !== -1);
  },

  get_watchlist: function() {
    if (typeof this.bot.saved.watchlist !== 'object') return;
    return Object.keys(this.bot.saved.watchlist).sort();
  },

  modify_watchlist: function(nick, add) {
    if (typeof nick !== 'string') return;
    if (typeof this.bot.saved.watchlist !== 'object') this.bot.saved.watchlist = {};
    nick = nick.toLowerCase();
    if (add) {
      this.bot.saved.watchlist[nick] = null;
    } else if (typeof this.bot.saved.watchlist[nick] !== 'undefined') {
      delete(this.bot.saved.watchlist[nick]);
    }
    return this.bot.save_data();
  }

};
