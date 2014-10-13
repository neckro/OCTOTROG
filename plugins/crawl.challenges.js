"use strict";
var foreach = require('foreach');

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
          foreach(challenges, function(c) {
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
