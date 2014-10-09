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
        'recent_games': self.dispatch('recent_games'),
        'challenges_current': self.dispatch('challenges_current'),
        'challenges_history': self.dispatch('challenges_history')
      })
      .then(function(result) {
        res.render('index.jade', result);
      });
    });

    app.get('/ajax/challenge/:challenge_id', function(req, res) {
      Promise.props({
        'games': self.dispatch('challenge_winners', req.params.challenge_id)
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
  }

};
