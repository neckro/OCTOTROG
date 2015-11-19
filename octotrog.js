#!/usr/bin/env node
"use strict";

var Octobot = require('octobot');
var secrets = require('./secrets.js');
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
  nick: 'OCTOTROG',
  nick_alt: 'OCTOTROG_',
  userName: 'OCTOTROG',
  realName: 'KILL THEM ALL!',
  port: 6667,
  channels: ['#octolog'],
  server: 'castleheck.tx.us.lunarnet.org'
})
.load('dictionary')
.load('crawl.data')
.load('crawl.challenges')
.load('crawl.watchlist')
.load('crawl', {
  relay_nick: 'OCTOTROG',
  relay_server: 'irc.freenode.net',
  relay_from: ['##crawl', '#octolog'],
  relay_to: ['#octolog'],
  irc: {
    userName: 'octotrog',
    realName: 'KILL THEM ALL!',
    showErrors: true,
    stripColors: false,
    floodProtection: true
  }
})
.load('crawl.www')
.load('crawl.twitter', {
  auth_tokens: secrets.twitter
})
.start();

