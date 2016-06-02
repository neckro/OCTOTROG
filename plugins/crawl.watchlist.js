"use strict";
var _ = require('lodash');

module.exports = {
  name: "watchlist",
  prefix: "!",
  init: function() {
    this.emitP('get_watchlist');
  },

  commands: {
    "addwatch": {
      description: "Watch a user. (Crawl name, NOT IRC nick!)",
      response: function(evt, msg) {
        var nick = msg.params.shift();
        var self = this;
        this.emitP('check_watchlist', nick)
        .then(function(val) {
          if (val) {
            msg.reply('FOOLISH WEAKLING!  I WAS ALREADY WATCHING %s.', nick.toUpperCase());
          } else {
            return (
              self.emitP('modify_watchlist', nick, true)
              .then(function() {
                msg.reply('I AM NOW WATCHING %s.  PRAISE BE TO TROG.', nick.toUpperCase());
              })
            );
          }
        })
        .catch(function(e) {
          msg.reply('TROG HAVE PROBLEM WITH READ AND WRITE.');
          this.dispatch('log:error', e);
        });
      }
    },
    "unwatch": {
      description: "Unwatch a user. (Crawl name, NOT IRC nick!)",
      response: function(evt, msg) {
        var nick = msg.params.shift();
        var self = this;
        self.emitP('check_watchlist', nick)
        .then(function(val) {
          if (!val) {
            msg.reply('FOOLISH WEAKLING!  I WAS NOT WATCHING %s.', nick.toUpperCase());
          } else {
            return (self.emitP('modify_watchlist', nick, false)
            .then(function() {
              msg.reply('I HAVE LET %s WANDER FROM MY GAZE.  PRAISE BE TO TROG.', nick.toUpperCase());
            }));
          }
        })
        .catch(function(e) {
          msg.reply('TROG HAVE PROBLEM WITH READ AND WRITE.');
          this.dispatch('log:error', e);
        });
      }
    },
    "watchlist": {
      description: "Show list of watched users.",
      response: function(evt, msg) {
        this.emitP('get_watchlist')
        .then(function(w) {
          msg.reply('I AM WATCHING: %s.  PRAISE BE TO TROG.', w.join(' '));
        });
      }
    }
  },

  listeners: {
    'get_watchlist': function(evt) {
      evt.resolve(
        this.dispatch('db:call', 'all', 'SELECT LOWER(player) AS player FROM watchlist ORDER BY LOWER(player)')
        .then(function(val) {
          var watchArray = [];
          this.watchlist = {};
          _.forEach(val, function(e) {
            this.watchlist[e.player] = true;
            watchArray.push(e.player);
          }, this);
          return watchArray;
        })
      );
    },

    'check_watchlist': function(evt, name, no_update) {
      if (typeof name !== 'string') return evt.resolve(false);
      var player = name.toLowerCase();
      var watched = !!(this.watchlist[player]);
      if (watched && !no_update) {
        this.dispatch('db:run', 'UPDATE watchlist SET last_seen = DATETIME("NOW") WHERE LOWER(player) = ?', player);
      }
      evt.resolve(watched);
    },

    'modify_watchlist': function(evt, nick, add) {
      var query;
      if (add) {
        query = 'INSERT OR IGNORE INTO watchlist (player) VALUES (LOWER(?))';
      } else {
        query = 'DELETE FROM watchlist WHERE LOWER(player) = ?';
      }
      return evt.resolve(
        this.dispatch('db:run', query, nick.toLowerCase())
        .then(function() {
          return this.emitP('get_watchlist');
        })
      );
    }
  }

};
