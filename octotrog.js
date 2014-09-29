"use strict";
var path = require('path');
var irc = require('irc');
var extend = require('extend');
var startStopDaemon = require('start-stop-daemon');
var ircbot = require('./src/ircbot');

// Configuration
var bot_options = {
  logs: {
    error: '~/logs/errors.%D.log',
    debug: '~/logs/debug.%D.log'
  },
  server: "irc.lunarnet.org",
  nick: "OCTOTROG",
  main_channel: '#octolog',
  irc: {
    userName: "octotrog",
    realName: "OCTOTROG",
    showErrors: true,
    stripColors: false,
    floodProtection: true
  },
  sayings: {
    greeting: "kill them all?",
    kicked: irc.colors.wrap('light_red', 'trog vigorously angry.'),
    help: "my commands are: %s. praise be to trog.",
    help_not_available: "no help available for: %s",
    watched: "i am watching: %s. praise be to trog.",
    watched_already: "foolish weakling! i am already watching %s.",
    unwatched_already: "foolish weakling! i was not watching %s.",
    watch_added: "i am now watching %s. praise be to trog.",
    watch_removed: "i have let %s wander from my gaze. praise be to trog.",
    database_error: "trog have problem with read and write."
  },
  say_transform: function(text) {
    return text.toString().toUpperCase();
  }
};

var crawl_options = {
  relay_nick: 'OCTOTROG',
  relay_server: 'irc.freenode.net',
  relay_channels: ['##crawl', '#octolog'],
  irc: {
    userName: "octotrog",
    realName: "OCTOTROG",
    showErrors: true,
    stripColors: false,
    floodProtection: true
  },
};

var TESTMODE = (process.argv[3] === 'test');

if (TESTMODE) {
  extend(bot_options, {
    main_channel: '#octotest',
    nick: 'TESTTROG'
  });
  extend(crawl_options, {
    relay_nick: 'TESTTROG',
    relay_server: 'irc.freenode.net'
  });
  crawl_options.relay_channels = ['#octotest'];
}

// Start the daemon
var daemon = startStopDaemon({
  outFile: path.resolve(__dirname, 'logs') + '/octotrog.log',
  max: 10
}, function() {
  // Start the bot
  var bot = new ircbot(bot_options);
  bot.load_plugin('database');
  bot.load_plugin('dictionary');
  bot.load_plugin('crawl.watchlist');
  bot.load_plugin('crawl', crawl_options);
  bot.load_plugin('crawl.www');
  var secrets = {};
  try {
    secrets = require('./secrets.js');
  } catch (e) {
    bot.load_plugin('crawl.twitter', {
      auth_tokens: secrets.twitter,
      test_mode: TESTMODE
    });
  }
});
