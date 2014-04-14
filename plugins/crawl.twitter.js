"use strict";
var twitter = require('twitter');
var express = require('express');
var http = require('http');
var sprintf = require('sprintf');

module.exports = {
  name: 'twitter',

  init: function() {
    this.twitter = new twitter(this.auth_tokens);
  },

  destroy: function() {
  },

  listeners: {
    'tweet': function(deferred, msg) {
      if (!msg) return;
      this.log.debug('Tweeting:', msg);
      this.twitter.updateStatus(msg, function(response) {
        deferred.resolve(response);
      });
    },
    'death_tweet': function(deferred, info) {
      deferred.resolve(this.emitP('tweet', this.death_tweet_text(info)));
    },
    'milestone_tweet': function(deferred, info) {
      deferred.resolve(this.emitP('tweet', this.milestone_tweet_text(info)));
    }
  },

  split_tweet: function(tweet_array, max_length) {
    max_length = max_length || 140;
    var text = '';
    for (var i = 0; i < tweet_array.length; i++) {
      if (typeof tweet_array[i] === 'undefined') continue;
      if (typeof tweet_array[i] === 'object') continue;
      if (text.length + tweet_array[i].length <= max_length) {
        text += tweet_array[i];
      }
    }
    return text;
  },

  death_tweet_text: function(info) {
    return this.split_tweet(
      [
        sprintf(
          '%s (L%s %s), %s',
          info.player,
          info.xl,
          info.race + info.class,
          info.fate.replace(/ \(.+\)/, '')
        ),
        info.preposition ? sprintf(' %s %s', info.preposition, info.place) : '',
        sprintf(' with %s points', info.score),
        sprintf(' after %s turns', info.turns)
      ], 118) + ': ' + info.morgue;
  },

  milestone_tweet_text: function(info) {
    var out = info.text;
    if (info.webtiles && out.length < 112) out += ' Watch: ' + info.webtiles;
    return out;
  }

};
