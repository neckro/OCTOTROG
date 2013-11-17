"use strict";
var fs = require('fs');
var irc = require('irc');
var path = require('path');
var util = require('util');
var events = require('events');
var extend = require('extend');
var sqlite3 = require('sqlite3');
var foreach = require('foreach');
var sprintf = require('sprintf');
var vsprintf = sprintf.vsprintf;
var Plugin = require('./plugin');

var defaults = {
  debug: false,
  plugin_path: './plugins',
  db_path: './db/save.db',
  max_line_length: 300,
  irc: {
    stripColors: false,
    floodProtection: true,
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
  init: function() {
    var self = this;
    this.client = new irc.Client(this.server, this.nick, this.irc);
    events.EventEmitter.call(this);
    this.plugins = {};
    // add bot event listeners
    foreach(this.listeners, function(l, e) {
      self.addListener(e, l.bind(self));
    });
    // add IRC listeners
    foreach(this.irc_listeners, function(l, e) {
      self.client.addListener(e, l.bind(self));
    });
    // load main default plugin
    this.load_plugin('main');
    // initialize database
    this.db = new (sqlite3.verbose().Database)(this.db_path);
    this.db.addListener('error', function(e) {
      console.warn('db error', e);
    });
  },

  load_plugin: function(name, callback) {
    try {
      var plugin_file = path.basename(name, '.js');
      require.resolve(this.plugin_path + '/' + plugin_file);
      // purge Node's require cache to force the file to be reloaded
      Object.keys(require.cache).forEach(function(c) {
        if (path.basename(c, '.js') === plugin_file) {
          delete require.cache[c];
        }
      });
      var plugin_module = require(this.plugin_path + '/' + plugin_file);
      if (typeof this.plugins[plugin_file] === 'object') {
        // Do cleanup on existing plugin
        this.plugins[plugin_file].destroy();
        delete this.plugins[plugin_file];
      }
      var plugin_instance = new Plugin(this, plugin_module);
      console.log("Loaded plugin " + plugin_file);
      if (typeof callback === 'function') callback.call(plugin_instance, this);
      this.plugins[plugin_file] = plugin_instance;
      return true;
    } catch (e) {
      // can't find plugin file
      console.warn("Warning: Can't find plugin " + plugin_file);
      return false;
    }
  },

  // Emit an event to all plugins
  dispatch: function() {
    if (this.debug) console.log('dispatch', arguments[0]);
    var args = Array.prototype.slice.call(arguments);
    this.each_plugin(function() {
      this.emit.apply(this, args);
    });
  },

  // Iterate all plugins with a callback
  each_plugin: function(callback) {
    foreach(this.plugins, function(p) {
      callback.call(p);
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
    this.client.say(target, text);
  },

  say_phrase: function(target, string_key) {
    if (typeof string_key !== 'string' || !this.sayings[string_key]) {
      console.log("GRR INVALID STRING KEY! " + string_key.toString());
      return;
    }
    arguments[1] = this.sayings[string_key];
    return this.say.apply(this, arguments);
  },

  // No longer used
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

  obj_insert: function(table, o, callback) {
    var keys = [], placeholders = [], values = [];
    var c = 1;
    Object.keys(o).forEach(function(k) {
      if (typeof o[k] === 'undefined') return;
      keys.push(k);
      placeholders.push('?' + c++);
      values.push(o[k]);
    });
    if (keys.length > 0) {
      var query = sprintf(
        'REPLACE INTO %s (%s) VALUES (%s)',
        table,
        keys.join(', '),
        placeholders.join(', ')
      );
      console.log(query);
      this.db.run(query, values, callback);
    }
  },

  listeners: {
    'say': function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this.main_channel);
      this.say.apply(this, args);
    },
    'say_phrase': function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this.main_channel);
      this.say_phrase.apply(this, args);
    },
    'reply': function() {
      this.say.apply(this, arguments);
    },
    'reply_phrase': function() {
      this.say_phrase.apply(this, arguments);
    }
  },

  irc_listeners: {
    'message': function(nick, to, text, message) {
      this.dispatch('message', nick, to, text, message);
    },
    'error': function() {
      console.log('irc error', arguments);
    },
    'join': function(channel, nick, message) {
      if (nick !== this.nick) return;
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
      if (nick === this.nick) this.kicked_flag = true;
    }
  }

});
