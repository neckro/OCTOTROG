"use strict";
var fs = require('fs');
var irc = require('irc');
var path = require('path');
var util = require('util');
var events = require('events');
var extend = require('extend');
var foreach = require('foreach');
var sprintf = require('sprintf');
var vsprintf = sprintf.vsprintf;
var Promise = require('bluebird');
var Plugin = require('./plugin');
var Logger = require('./logger');

var dispatch_timeout = 30000;

var defaults = {
  debug: true,
  plugin_path: '../plugins',
  max_line_length: 400,
  irc: {
    channels: []
  }
};

var Bot = module.exports = function(opt) {
  extend(true, this, defaults, opt);
  this.irc.channels.push(this.main_channel);
  this.init();
};

util.inherits(Bot, events.EventEmitter);

extend(Bot.prototype, {
  name: 'ircbot',
  init: function() {
    this.client = new irc.Client(this.server, this.nick, this.irc);
    this.log = new Logger(this.logs, this, '[OCTOTROG]');
    this.log.bind_listeners(this.client, 'irc');
    events.EventEmitter.call(this);
    this.plugins = {};
    // add bot event listeners
    foreach(this.listeners, function(l, e) {
      this.addListener(e, l.bind(this));
    }, this);
    // add IRC listeners
    foreach(this.irc_listeners, function(l, e) {
      this.client.addListener(e, l.bind(this));
    }, this);
    // load main default plugin
    this.load_plugin('main');
  },

  load_plugin: function(name, options) {
    try {
      options = options || {};
      var plugin_file = path.basename(name, '.js');
      var plugin_path = this.plugin_path + '/' + plugin_file;
      require.resolve(plugin_path);
      // purge Node's require cache to force the file to be reloaded
      Object.keys(require.cache).forEach(function(c) {
        if (path.basename(c, '.js') === plugin_file) {
          delete require.cache[c];
        }
      });
      var plugin_module = require(plugin_path);
      if (typeof this.plugins[plugin_file] === 'object') {
        // Do cleanup on existing plugin
        this.plugins[plugin_file].destroy();
        delete this.plugins[plugin_file];
      }
      var plugin_instance = new Plugin(this, plugin_module, options);
      plugin_instance.bind_channels(options.channels || this.main_channel);
      this.log.debug('Loaded plugin', plugin_file);
      this.plugins[plugin_file] = plugin_instance;
      return true;
    } catch (e) {
      // can't find plugin file
      this.log.error(e, "Warning: Can't find plugin", plugin_file);
      return false;
    }
  },

  // Emit an event to all plugins
  // Returns a race promise with a timeout
  dispatch: function() {
    var args = arguments;
    var promise_queue = [];
    this.each_plugin(function() {
      promise_queue.push(this.emitP.apply(this, args));
    });
    return Promise.any(promise_queue);
  },

  // Iterate all plugins with a callback
  each_plugin: function(callback) {
    var args = Array.prototype.slice.call(arguments, 1);
    foreach(this.plugins, function(p) {
      callback.apply(p, args);
    });
  },

  say: function() {
    var args = Array.prototype.slice.call(arguments);
    var transform = this.say_transform;
    var target = args.shift();
    var text = args.shift();
    if (text === false) {
      transform = false;
      text = args.shift();
    }
    if (typeof text !== 'string') return;
    var linepos = 0;
    if (args.length > 0) text = vsprintf(text, args);
    if (typeof transform === 'function') {
      text = this.say_transform(text);
    }
    this.client.say(target, this.split_line(text, this.max_line_length));
  },

  say_phrase: function(target, string_key) {
    if (typeof string_key !== 'string' || !this.sayings[string_key]) {
      this.log.error("Can't find string key:", string_key);
      return;
    }
    arguments[1] = this.sayings[string_key];
    return this.say.apply(this, arguments);
  },

  color_wrap: function(text, color) {
    if (typeof color === 'string') {
      return ('\u0003' + color + text + '\u0003');
    }
    return text;
  },

  split_line: function(text, length) {
    var out = '', pos;
    if (!length || typeof text !== 'string') return;
    while (text.length > length) {
      pos = length;
      while (pos > 0 && text.charAt(pos) !== ' ') pos--;
      if (pos === 0) pos = length;
      out += text.substr(0, pos) + "\n";
      text = text.substr(pos + 1);
    }
    out += text;
    return out;
  },

  listeners: {
    // Nothing here
  },

  irc_listeners: {
    'message': function(nick, to, text, message) {
      var replyto = (to === this.client.nick) ? nick : to;
      var opt = {
        from: nick,
        to: to,
        text: text.trim(),
        privmsg: (to === this.client.nick),
        bot: this,
        message: message,
        reply: function(reply) {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(replyto);
          opt.bot.say.apply(opt.bot, args);
        },
        reply_phrase: function(reply) {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(replyto);
          opt.bot.say_phrase.apply(opt.bot, args);
        }
      };
      this.dispatch('message', opt);
    },
    'error': function() {
      this.log.error(arguments, 'IRC error');
    },
    'join': function(channel, nick, message) {
      if (nick !== this.client.nick) return;
      if (channel !== this.main_channel) return;
      if (this.kicked_flag) {
        this.say_phrase(channel, 'kicked');
        this.kicked_flag = false;
      } else {
        this.say_phrase(channel, 'greeting');
      }
    },
    'kick': function(channel, nick, by, reason, message) {
      // set flag so bot will complain on rejoin
      if (nick === this.client.nick) this.kicked_flag = true;
    }
  }

});
