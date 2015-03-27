"use strict";

module.exports = {
  name: "watchlist",
  prefix: "!",
  init: function() {
    // Load watchlist
    var watchlist = this.watchlist = {};

    this.dispatch('db_call', 'all', 'SELECT player FROM watchlist')
    .then(function(val) {
      if (!Array.isArray(val)) return;
      val.forEach(function(e) {
        watchlist[e.player.toLowerCase()] = true;
      });
    });
  },

  commands: {
    "addwatch": {
      description: "Watch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        var self = this;
        this.emitP('check_watchlist', nick)
        .then(function(val) {
          if (val) {
            opt.reply_phrase('watched_already', nick);
          } else {
            return (
              self.emitP('modify_watchlist', nick, true)
              .then(function() {
                opt.reply_phrase('watch_added', nick);
              })
            );
          }
        })
        .catch(function() {
          opt.reply_phrase('database_error');
        });
      }
    },
    "unwatch": {
      description: "Unwatch a user. (Crawl name, NOT IRC nick!)",
      response: function(opt) {
        var nick = opt.params.shift();
        var self = this;
        self.emitP('check_watchlist', nick)
        .then(function(val) {
          if (!val) {
            opt.reply_phrase('unwatched_already', nick);
          } else {
            return (self.emitP('modify_watchlist', nick, false)
            .then(function() {
              opt.reply_phrase('watch_removed', nick);
            }));
          }
        })
        .catch(function() {
          opt.reply_phrase('database_error');
        });
      }
    },
    "watchlist": {
      description: "Show list of watched users.",
      response: function(opt) {
        this.emitP('get_watchlist')
        .then(function(w) {
          var list = 'nobody';
          if (w && w.length) {
            list = w.sort().join(' ');
          }
          opt.reply_phrase('watched', list);
        });
      }
    }
  },

  listeners: {
    'check_watchlist': function(resolver, name, no_update) {
      if (typeof name !== 'string') return resolver(false);
      var player = name.toLowerCase();
      var watched = !!(this.watchlist[player]);
      if (watched && !no_update) {
        this.dispatch('db_run', 'UPDATE watchlist SET last_seen = DATETIME("NOW") WHERE player = ?', player);
      }
      resolver(watched);
    },
    'get_watchlist': function(resolver) {
      resolver(Object.keys(
        (typeof this.watchlist === 'object') ? this.watchlist : {}
      ));
    },
    'modify_watchlist': function(resolver, nick, add) {
      var self = this;
      if (!add && this.watchlist[nick]) {
        resolver(
          this.dispatch('db_run', 'DELETE FROM watchlist WHERE player = ?', nick)
          .then(function() {
            delete(self.watchlist[nick]);
            return true;
          })
        );
      } else if (add) {
        resolver(
          this.dispatch('db_run', 'INSERT INTO watchlist (player) VALUES (?)', nick)
          .then(function() {
            self.watchlist[nick] = true;
            return true;
          })
        );
      } else {
        resolver(false);
      }
    }
  }

};
