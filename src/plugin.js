// Plugin prototype
"use strict";
var util = require('util');
var events = require('events');
var extend = require('extend');
var foreach = require('foreach');
var Promise = require('bluebird');

var Plugin = module.exports = function(bot, plugin_obj, options) {
  extend(this, plugin_obj, options, {
    command_map: {},
    channels: {},
    bot: bot,
    debug: bot.debug
  });

  this.log = bot.log.attach(this, '[' + (this.name || '???') + ']');
  events.EventEmitter.call(this);
  this.create_command_map();
  this.init();
  var self = this;
  foreach(extend({}, Listeners, this.listeners), function(l, n) {
    self.addListener(n, l);
  });
};

util.inherits(Plugin, events.EventEmitter);

// To be extended by plugin module
extend(Plugin.prototype, {
  name: 'plugin-base',
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
  // Emitted events receive a Promise as first argument
  // This is also used by bot's .dispatch()
  emitP: function(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var self = this;
    var p = new Promise(function(resolve, reject) {
      args.unshift(event, resolve);
      self.emit.apply(self, args);
    });
    return p.bind(this);
  },

  // Return a promise that resolves when a data object passes the validator
  queueExpect: function(name, validator) {
    this.expect_queue = this.expect_queue || {};
    var queue = this.expect_queue;
    if (!Array.isArray(this.expect_queue[name])) {
      queue[name] = [];
    }
    var p = new Promise(function(resolve, reject) {
      queue[name].push({
        resolver: resolve,
        validator: validator
      });
    });
    this.log.debug('Expecting:', name);
    return p.bind(this);
  },

  queueExpectKeys: function(name, data, keys) {
    return this.queueExpect(name, function(test) {
      return keys.every(function(k) {
        return (data[k] === test[k]);
      });
    });
  },

  // See if the supplied data matches an item in the queue
  queueResolve: function(name, data) {
    if (!this.expect_queue || !this.expect_queue[name]) return;
    var out_queue = [];
    var resolved = 0, pending = 0, pruned = 0;
    this.expect_queue[name].forEach(function(e) {
      if (e && typeof e.resolver === 'function') {
        if (e.validator(data)) {
          // Resolve it
          e.resolver(data);
          resolved++;
        } else {
          // Not yet resolved, keep in queue
          out_queue.push(e);
          pending++;
        }
      } else {
        pruned++;
      }
    });
    this.expect_queue[name] = out_queue;
    if (resolved) {
      this.log.debug('Queue', name, 'Resolved:', resolved, 'Pending:', pending, 'Pruned:', pruned);
    }
    return resolved;
  },

  say_wrapper: function(method, args) {
    Array.prototype.unshift.call(args, '');
    var bot = this.bot;
    foreach(this.channels, function(e, i) {
      args[0] = i;
      bot[method].apply(bot, args);
    });
  },

  // Wrappers for bot functions... surely there's a better way to do this
  // The idea is that plugins should never have to access the bot object
  say: function() {
    return this.say_wrapper('say', arguments);
  },

  say_phrase: function() {
    return this.say_wrapper('say_phrase', arguments);
  },

  color_wrap: function() {
    return this.bot.color_wrap.apply(this.bot, arguments);
  },

  dispatch: function(event) {
    this.log.debug('Event dispatched:', event);
    return this.bot.dispatch.apply(this.bot, arguments).bind(this);
  }

});

var Listeners = {
  'message': function(resolver, opt) {
    // Look for a command handler
    var input = opt.text + ' ';
    if (!(opt.privmsg || this.channels[opt.to])) {
      return resolver(Promise.reject('Not bound channel'));
    }
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
          resolver(opt.handler.response.call(this, opt));
        }
        return true;
      }
    }, this)) {
      // Couldn't find handler
      return resolver(Promise.reject("Couldn't find handler"));
    }
  },
  'error': function(e) {
    this.log.error('Plugin listener error', e);
  }
};
