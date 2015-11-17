"use strict";
var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
  name: 'crawl-data',

  init: function() {
  },

  listeners: {
    'recent_games': function(evt, num_games) {
      num_games = num_games || 5;
      evt.resolve(this.dispatch('db:call', 'all', 'SELECT * FROM `deaths` ORDER BY `date` DESC LIMIT ?', num_games));
    },
    'challenges_current': function(evt) {
      evt.resolve(
        this.dispatch('db:call', 'all', 'SELECT * FROM challenges_view WHERE CURRENT_TIMESTAMP BETWEEN start AND end')
        .then(function(v) {
          return this.emitP('challenge_data', v, -1);
        })
      );
    },
    'challenges_current_summary': function(evt) {
      evt.resolve(
        this.dispatch('db:call', 'all', 'SELECT *, MAX(score) FROM challenge_best_attempts WHERE hours_left > 0 GROUP BY challenge_id ORDER BY start_date, score')
      );
    },
    'challenges_history': function(evt) {
      evt.resolve(
        this.dispatch('db:call', 'all', 'SELECT * FROM challenges_view WHERE end < CURRENT_TIMESTAMP ORDER BY end_date DESC')
        .then(function(v) {
          return this.emitP('challenge_data', v, 1);
        })
      );
    },
    'challenge_data': function(evt, challenges, limit) {
      limit = limit || -1;
      var promise_list = [];
      _.forEach(challenges, function(c) {
        promise_list.push(
          this.emitP('challenge_winners', c.challenge_id, limit)
          .then(function(v) {
            c.games = v;
            return c;
          })
        );
      }, this);
      return evt.resolve(Promise.all(promise_list));
    },
    'challenge_winners': function(evt, challenge_id, limit) {
      limit = limit || -1;
      evt.resolve(this.dispatch('db:call', 'all', 'SELECT * FROM challenge_best_attempts WHERE challenge_id = ? ORDER BY score DESC LIMIT ?', challenge_id, limit));
    }
  }

};
