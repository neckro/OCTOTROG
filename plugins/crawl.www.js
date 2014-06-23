"use strict";
var foreach = require('foreach');
var express = require('express');
var engines = require('consolidate');
var http = require('http');
var Promise = require('bluebird');

module.exports = {
  name: 'crawl-www',
  port: 5690,
  hostname: 'localhost',
  webdir: 'www',
  viewsdir: 'views',

  init: function() {
    // Set up http server and express
    var self = this;
    var app = this.app = express();
    this.server = http.createServer(app);
    this.server.listen(this.port, this.hostname);
    app.use(express.static(this.webdir));
    app.set('views', this.viewsdir);
    app.set('view engine', 'jade');
    app.set('view options', { layout: false }); 
    app.engine('jade', engines.jade);

    // Set routes
    app.get('/', function(req, res) {
      Promise.props({
        'recent_games': self.emitP('recent_games'),
        'challenges_current': self.emitP('challenges_current'),
        'challenges_history': self.emitP('challenges_history')
      })
      .then(function(result) {
        res.render('index.jade', result);
      });
    });

    app.get('/ajax/challenge/:challenge_id', function(req, res) {
      Promise.props({
        'games': self.emitP('challenges_ajax', req.params.challenge_id)
      })
      .then(function(result) {
        res.render('ajax_game_table.jade', result);
      });
    });
  },

  destroy: function() {
    // TODO: This doesn't seem to destroy the Express router instance, so
    // reloading this plugin doesn't work properly yet.
    this.server.close();
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
    'challenges_ajax': function(resolver, challenge_id) {
      resolver(this.dispatch('db_call', 'all', 'SELECT * FROM challenge_best_attempts WHERE challenge_id = ? ORDER BY score DESC', challenge_id));
    }
  }

};
