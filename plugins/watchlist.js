"use strict";

module.exports = {
  name: "watchlist",
  prefix: "!",
  init: function() {
    // Load watchlist
    var watchlist = this.watchlist = {};
    this.bot.db.each(
      'SELECT player FROM watchlist',
      function(e, r) {
        if (typeof r !== 'object') return;
        if (typeof r.player !== 'string') return;
        watchlist[r.player.toLowerCase()] = true;
      }
    );
  },

  commands: {
    "watch": {
      description: "Watch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        if (this.check_watchlist(nick, true)) {
          opt.reply_phrase('watched_already', nick);
        } else {
          this.modify_watchlist(nick, true, function(e) {
            if (e) {
              // todo: check for error
              console.warn(e);
            } else {
              opt.reply_phrase('watch_added', nick);
            }
          });
        }
      }
    },
    "unwatch": {
      description: "Unwatch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        if (!this.check_watchlist(nick, true)) {
          opt.reply_phrase('unwatched_already', nick);
        } else {
          this.modify_watchlist(nick, false, function(e) {
            if (e) {
              // todo: check for error
              console.warn(e);
            } else {
              opt.reply_phrase('watch_removed', nick);
            }
          });
        }
      }
    },
    "watched": {
      description: "Show list of watched users.",
      response: function(opt) {
        var watchlist = Object.keys(this.watchlist).sort().join(' ');
        if (watchlist.length === 0) watchlist = 'nobody';
        opt.reply_phrase('watched', watchlist);
      }
    }
  },

  listeners: {
    'check_watchlist': function(name, callback) {
      callback(this.check_watchlist(name));
    }
  },

  check_watchlist: function(name, no_update) {
    if (typeof name !== 'string') return;
    var check = !!(this.watchlist[name.toLowerCase()]);
    if (check && !no_update) {
      this.bot.db.run('UPDATE watchlist SET last_seen = DATETIME("NOW") WHERE player = ?', name, function(e) {
        if (e) console.log(e);
      });
    }
    return check;
  },

  modify_watchlist: function(nick, add, callback) {
    if (!add && this.watchlist[nick]) {
      this.bot.db.run('DELETE FROM watchlist WHERE player = ?', nick, callback);
      delete(this.watchlist[nick]);
    } else if (add) {
      this.bot.db.run('INSERT INTO watchlist (player) VALUES (?)', nick, callback);
      this.watchlist[nick] = true;
    }
  }

};
