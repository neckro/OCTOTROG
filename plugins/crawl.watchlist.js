"use strict";
var foreach = require('foreach');

module.exports = {
  name: "watchlist",
  prefix: "!",
  init: function() {
    this.emitP('get_watchlist');
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
        .catch(function(e) {
          opt.reply_phrase('database_error');
          this.log.error(e);
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
        .catch(function(e) {
          opt.reply_phrase('database_error');
          this.log.error(e);
        });
      }
    },
    "watchlist": {
      description: "Show list of watched users.",
      response: function(opt) {
        this.emitP('get_watchlist')
        .then(function(w) {
          opt.reply_phrase('watched', w.join(' '));
        });
      }
    }
  },

  listeners: {
    'get_watchlist': function(resolver) {
      resolver(
        this.dispatch('db_call', 'all', 'SELECT LOWER(player) AS player FROM watchlist ORDER BY LOWER(player)')
        .then(function(val) {
          var watchArray = [];
          this.watchlist = {};
          foreach(val, function(e) {
            this.watchlist[e.player] = true;
            watchArray.push(e.player);
          }, this);
          return watchArray;
        })
      );
    },

    'check_watchlist': function(resolver, name, no_update) {
      if (typeof name !== 'string') return resolver(false);
      var player = name.toLowerCase();
      var watched = !!(this.watchlist[player]);
      if (watched && !no_update) {
        this.dispatch('db_run', 'UPDATE watchlist SET last_seen = DATETIME("NOW") WHERE LOWER(player) = ?', player);
      }
      resolver(watched);
    },

    'modify_watchlist': function(resolver, nick, add) {
      var self = this;
      var query;
      if (add) {
        query = 'INSERT OR IGNORE INTO watchlist (player) VALUES (LOWER(?))';
      } else {
        query = 'DELETE FROM watchlist WHERE LOWER(player) = ?';
      }
      return resolver(
        this.dispatch('db_run', query, nick.toLowerCase())
        .then(function() {
          return this.emitP('get_watchlist');
        })
      );
    }
  }

};
