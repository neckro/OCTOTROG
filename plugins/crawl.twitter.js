"use strict";
var twitter = require('twitter');
var format = require('util').format;

module.exports = {
  name: 'twitter',

  init: function() {
    this.twitter = new twitter(this.auth_tokens);
  },

  destroy: function() {
  },

  listeners: {
    'tweet': function(evt, message) {
      if (!message) return;
      if (this.test_mode) {
        this.dispatch('log:debug', "Pretend I'm Tweeting:", message);
        evt.resolve(true);
      } else {
        this.dispatch('log:debug', "Actually Tweeting:", message);
        this.twitter.updateStatus(message, function(response) {
          evt.resolve(response);
        });
      }
    },
    'tweet:death': function(evt, info) {
      evt.resolve(this.emitP('tweet', this.death_tweet_text(info)));
    },
    'tweet:milestone': function(evt, info) {
      evt.resolve(this.emitP('tweet', this.milestone_tweet_text(info)));
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
        format(
          '%s (L%s %s), %s',
          info.player,
          info.xl,
          info.race + info.class,
          info.fate.replace(/ \(.+\)/, '')
        ),
        info.preposition ? format(' %s %s', info.preposition, info.place) : '',
        format(' with %s points', info.score),
        format(' after %s turns', info.turns)
      ], 118) + ': ' + info.morgue;
  },

  milestone_tweet_text: function(info) {
    var out = info.text;
    if (info.webtiles && out.length < 112) out += ' Watch: ' + info.webtiles;
    return out;
  }

};
