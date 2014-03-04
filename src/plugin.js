// Plugin prototype
"use strict";
var util = require('util');
var events = require('events');
var extend = require('extend');
var foreach = require('foreach');
var Promise = require('bluebird');

var Plugin = module.exports = function(bot, plugin_obj, options) {
  extend(this, {
    command_map: {},
    channels: {},
    bot: bot
  }, plugin_obj, options || {});

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
  },

  bind_channels: function(channels) {
    if (typeof channels === 'string') channels = [channels];
    if (!Array.isArray(channels)) return;
    channels.forEach(function(e) {
      this.channels[e] = true;
    }, this);
  },

  // Emit an event to self, returning a promise
  // Emitted events receive a PromiseResolver as first argument
  // This is also used by bot's .dispatch()
  emitP: function(event) {
    var deferred = Promise.defer();
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(event, deferred);
    this.emit.apply(this, args);
    return deferred.promise.bind(this);
  },

  // Add a promise resolver to the event queue, or create a new one
  // This resolver and its data gets checked/resolved by queueResolve
  queueExpect: function(event, data, deferred) {
    this.expect_queue = this.expect_queue || {};
    if (typeof deferred === 'undefined') deferred = Promise.defer();
    if (!Array.isArray(this.expect_queue[event])) {
      this.expect_queue[event] = [];
    }
    this.expect_queue[event].push({
      deferred: deferred,
      data: data
    });
    return deferred.promise.bind(this);
  },

  // Use a filter function to see if a deferred in the queue can be resolved
  queueResolve: function(event, data, compare) {
    if (typeof this.expect_queue !== 'object') this.expect_queue = {};
    var out_queue = [], r = false;
    if (Array.isArray(this.expect_queue[event])) {
      this.expect_queue[event].forEach(function(e) {
        if (e && e.deferred && e.deferred.resolve && e.deferred.promise.isPending()) {
          if (compare(e.data, data)) {
            // Resolve it
            e.deferred.resolve(data);
            r = true;
          } else {
            // Not yet resolved, keep in queue
            out_queue.push(e);
          }
        }
      });
    }
    this.expect_queue[event] = out_queue;
    return r;
  },

  // Utility method to do a queueResolve based on an array of object properties
  queueCompare: function(event, data, props) {
    return this.queueResolve(event, data, function(a, b) {
      return props.every(function(e) {
        return a.e === b.e;
      });
    });
  },

  // Wrappers for bot functions... surely there's a better way to do this
  // The idea is that plugins should never have to access the bot object

  say: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('');
    foreach(this.channels, function(v, c) {
      args[0] = c;
      this.bot.say.apply(this.bot, args);
    }, this);
  },

  say_phrase: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('');
    foreach(this.channels, function(v, c) {
      args[0] = c;
      this.bot.say_phrase.apply(this.bot, args);
    }, this);
  },

  dispatch: function() {
    return this.bot.dispatch.apply(this.bot, arguments).bind(this);
  }

});

var Listeners = {
  'message': function(deferred, opt) {
    // Look for a command handler
    var input = opt.text + ' ';
    if (!(opt.privmsg || this.channels[opt.to])) return; // Not-bound channel
    if (!Object.keys(this.command_map).some(function(c) {
      if (input.indexOf(c) === 0) {
        // Found a match
        var msg = opt.text.substr(c.length).trim();
        var params = msg.split(' ');
        if (params[0] === '') params = [];
        opt = extend({}, opt, {
          handler: this.command_map[c],
          command: c.trim(),
          msg: opt.text.substr(c.length).trim(),
          params: params,
        });
        if (opt.handler.response) {
          // Execute handler
          deferred.resolve(opt.handler.response.call(this, opt));
        }
        return true;
      }
    }, this)) {
      // Couldn't find handler
      deferred.reject();
    }
  },
  'error': function(e) {
    console.warn('plugin listener error', e);
  }
};
