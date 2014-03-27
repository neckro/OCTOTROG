"use strict";
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
        'challenge_current': self.emitP('current_challenge'),
        'challenge_history': self.emitP('challenge_history')
      })
      .then(function(result) {
        res.render('index.jade', result);
      });
    });

    app.get('/ajax/challenge/:challenge_id', function(req, res) {
      Promise.props({
        'games': self.emitP('ajax_challenge', req.params.challenge_id)
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
    'recent_games': function(deferred, num_games) {
      num_games = num_games || 5;
      deferred.resolve(this.dispatch('db_call', 'all', 'SELECT * FROM `deaths` ORDER BY `date` DESC LIMIT ?', num_games));
    },
    'challenge_current': function(deferred) {
      deferred.resolve(this.dispatch('db_call', 'all', 'SELECT * FROM challenge_current'));
    },
    'challenge_history': function(deferred) {
      deferred.resolve(this.dispatch('db_call', 'all', 'SELECT * FROM challenge_winners ORDER BY challenge_id DESC'));
    },
    'ajax_challenge': function(deferred, challenge_id) {
      deferred.resolve(this.dispatch('db_call', 'all', 'SELECT * FROM challenge_best_attempts WHERE challenge_id = ? ORDER BY score DESC', challenge_id));
    }
  }

};
