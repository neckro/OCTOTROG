// Plugin prototype
"use strict";
var util = require('util');
var events = require('events');
var extend = require('extend');
var foreach = require('foreach');

var Plugin = module.exports = function(bot, plugin_obj) {
  extend(this, plugin_obj);
  this.bot = bot;
  events.EventEmitter.call(this);
  this.create_command_map();
  this.init();
  var self = this;
  foreach(Listeners, function(l, n) {
    self.addListener(n, l);
  });
  if (typeof this.listeners === 'object') {
    foreach(this.listeners, function(l, n) {
      self.addListener(n, l);
    });
  }
};

util.inherits(Plugin, events.EventEmitter);

// To be extended by plugin module
extend(Plugin.prototype, {
  name: 'Plugin',
  prefix: '',
  init: function() {},
  listeners: {},

  destroy: function() {
    this.removeAllListeners();
  },

  create_command_map: function() {
    var command_map = this.command_map = {};
    var prefix = this.prefix || '';
    foreach(this.commands || {}, function(c, n) {
      var trigger = prefix + n;
      if (!c.no_space) trigger += ' ';
      if (typeof c.response === 'function') command_map[trigger] = c;
    });
  }
});

var Listeners = {
  'error': function(e) {
    console.warn('plugin listener error', e);
  },
  'message': function(nick, to, text, message) {
    // Check for command handlers
    var handler, opt;
    var input = text + ' ';
    foreach(this.command_map, function(h, c) {
      if (input.indexOf(c) === 0) {
        // Found a match
        handler = h.response;
        var params = text.substr(c.length).trim().split(' ');
        if (params[0] === '') params = [];
        opt = {
          command: c.trim(),
          msg: text.substr(c.length).trim(),
          nick: nick,
          text: text.trim(),
          params: params
        };
      }
    });
    if (!handler) return;
    // Redirect reply to either the channel or nick
    extend(opt, {
      bot: this.bot,
      replyto: (to.indexOf('#') === 0) ? to : nick,
      reply: function(reply) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('reply', opt.replyto);
        opt.bot.emit.apply(opt.bot, args);
      },
      reply_phrase: function(reply) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('reply_phrase', opt.replyto);
        opt.bot.emit.apply(opt.bot, args);
      },
    });
    handler.call(this, opt);
  }
};
