"use strict";
var irc = require('irc');
var relaybot = require('./relaybot');
var sources = require('./sources');

var bot = relaybot.create({
  main_server: "irc.lunarnet.org",
  main_channel: "#octotest",
  relay_server: "chat.freenode.net",
  relay_channel: "##crawl",
//  relay_server: "irc.lunarnet.org",
//  relay_channel: "#octotest",
  main_nick: "ALTERNATROG",
  relay_nick: "RELAYTROG",
  irc_options: {
    userName: "octotrog",
    realName: "OCTOTROG",
    debug: true,
    showErrors: true
  },
  savefile: './octosave.json',
  command_regex: /^[!$?%@]/,
  "sayings": {
    greeting: "kill them all?",
    kicked: irc.colors.wrap('light_red', 'trog vigorously angry.'),
    help: "my commands are: %s. praise be to trog.",
    help_not_available: "no description available.",
    watched: "i am watching: %s. praise be to trog.",
    watched_already: "cowardly weakling! i am already watching %s.",
    unwatched_already: "cowardly weakling! i was not watching %s.",
    watch_added: "i am now watching %s. praise be to trog.",
    watch_removed: "i have let %s wander from my gaze. praise be to trog."
  },
  say_transform: function(text) {
    return text.toString().toUpperCase();
  }

});

bot.add_sources(sources);

module.exports = bot;
