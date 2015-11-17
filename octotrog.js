#!/usr/bin/env node
"use strict";

var Octobot = require('octobot');
var OCTOTROG = new Octobot();

OCTOTROG
.load('logger', {
  logdir: './logs',
  logfiles: {
    'octotrog.log': {
      levels: ['debug', 'irc', 'log']
    }
  }
})
.load('main')
.load('database')
.load('irc', {
  nick: 'TESTTROG',
  nick_alt: 'OCTOTROG_',
  userName: 'OCTOTROG',
  realName: 'KILL THEM ALL!',
  port: 6667,
  channels: ['#octotest'],
  server: 'castleheck.tx.us.lunarnet.org'
})
.load('dictionary')
.load('crawl.data')
.load('crawl.challenges')
.load('crawl.watchlist')
.load('crawl', {
  relay_nick: 'TESTTROG',
  relay_server: 'irc.freenode.net',
  relay_from: ['##crawl', '#octolog'],
  relay_to: ['#octotest'],
  irc: {
    userName: 'octotrog',
    realName: 'KILL THEM ALL!',
    showErrors: true,
    stripColors: false,
    floodProtection: true
  }
})
.load('crawl.www')
.load('crawl.twitter')
;

try {
  // var secrets = require('./secrets.js');
  // OCTOTROG.load('crawl.twitter', {
  //   auth_tokens: secrets.twitter
  // });
} catch (e) {
  // Don't load this plugin if there was an error finding the secrets file
}

OCTOTROG.start();
