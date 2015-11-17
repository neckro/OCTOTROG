"use strict";
var _ = require('lodash');

module.exports = {
  name: "crawl-challenges",
  prefix: "!",
  init: function() {
  },

  commands: {
    "challenge": {
      description: "Show current challenge.",
      response: function(opt) {
        this.dispatch('challenges_current_summary')
        .then(function(challenges) {
          _.forEach(challenges, function(c) {
            opt.reply(
              'challenge is: %s%s. current leader: %s with %u points. challenge ends in: %s hours.',
              c.race, c.class, c.player, c.score, c.hours_left
            );
          });
        });
      }
    }
  },

  listeners: {
  }

};
