"use strict";
var foreach = require('foreach');
var express = require('express');
var engines = require('consolidate');
var http = require('http');
var Promise = require('bluebird');

module.exports = {
  name: 'crawl-data',

  init: function() {
  },

  listeners: {
    'recent_games': function(resolver, num_games) {
      num_games = num_games || 5;
      resolver(this.dispatch('db_call', 'all', 'SELECT * FROM `deaths` ORDER BY `date` DESC LIMIT ?', num_games));
    },
    'challenges_current': function(resolver) {
      resolver(
        this.dispatch('db_call', 'all', 'SELECT * FROM challenges_view WHERE CURRENT_TIMESTAMP BETWEEN start AND end')
        .then(function(v) {
          return this.emitP('challenge_data', v, -1);
        })
      );
    },
    'challenges_history': function(resolver) {
      resolver(
        this.dispatch('db_call', 'all', 'SELECT * FROM challenges_view WHERE end < CURRENT_TIMESTAMP ORDER BY end_date DESC')
        .then(function(v) {
          return this.emitP('challenge_data', v, 1);
        })
      );
    },
    'challenge_data': function(resolver, challenges, limit) {
      limit = limit || -1;
      var promise_list = [];
      foreach(challenges, function(c) {
        promise_list.push(
          this.dispatch('db_call', 'all', 'SELECT * FROM challenge_best_attempts WHERE challenge_id = ? ORDER BY score DESC LIMIT ?', c.challenge_id, limit)
          .then(function(v) {
            c.games = v;
            return c;
          })
        );
      }, this);
      return resolver(Promise.all(promise_list));
    },
    'challenge_winners': function(resolver, challenge_id) {
      resolver(this.dispatch('db_call', 'all', 'SELECT * FROM challenge_best_attempts WHERE challenge_id = ? ORDER BY score DESC', challenge_id));
    }
  }

};
