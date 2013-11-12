"use strict";
var fs = require('fs');
var irc = require('irc');
var path = require('path');
var extend = require('extend');
var vsprintf = require('sprintf').vsprintf;

var defaults = {
  max_line_length: 300,
  irc: {
    stripColors: false,
    floodProtection: true
  }
};

var Bot = {
  create: function(opt) {
    var bot = Object.create(Bot);
    extend(true, bot, defaults, opt);
    bot.irc.channels = [bot.main_channel];
    bot.plugins = {};

    // other default handling
    bot.client = new irc.Client(bot.server, bot.nick, bot.irc);

    // load JSON file
    bot.load_data();

    // load main default plugin
    bot.load_plugin('main');

    // add main listeners
    Object.keys(bot.listeners).forEach(function(l) {
      bot.client.addListener(l, bot.listeners[l].bind(bot));
    });

    // TODO: detect nick change?
    return bot;
  },

  get_handler: function(input) {
    var handler;
    if (typeof input !== 'string' || input.length === 0) return;
    var text = input.toLowerCase() + ' ';

    this.plugin_any(function(plugin) {
      var prefix = (typeof plugin.prefix === 'string') ? plugin.prefix : '';
      if (
        prefix.length === 0 || (
          text.length >= prefix.length &&
          text.substr(0, prefix.length) === prefix
        )
      ) {
        // check this plugin for matching handler
        return Object.keys(plugin.commands).some(function(cmd) {
          var test, params;
          var command = plugin.commands[cmd];
          test = prefix + cmd + (command.no_space ? '' : ' ');
          if (test.length > text.length) return;
          if (text.substr(0, test.length) === test) {
            // found a match
            params = input.substr(test.length).trim().split(/ +/);
            if (params[0] === '') params = [];
            handler = {
              command: plugin.commands[cmd],
              plugin: plugin,
              action: prefix + cmd,
              params: params,
              text: params.join(' '),
              fulltext: input
            };
            return true;
          }
        });
      }
    });
    return handler;
  },

  plugin_any: function(fn) {
    if (typeof this.plugins !== 'object') return;
    return Object.keys(this.plugins).some(function(k) {
      return fn(this.plugins[k]);
    }, this);
  },

  plugin_every: function(fn) {
    if (typeof this.plugins !== 'object') return;
    return Object.keys(this.plugins).forEach(function(k) {
      return fn(this.plugins[k]);
    }, this);
  },

  load_plugin: function(name, prefix) {
    var plugin_file = 'plugin.' + path.basename(name, '.js');
    try {
      require.resolve('./' + plugin_file);
      // purge Node's require cache to force the file to be reloaded
      Object.keys(require.cache).forEach(function(c) {
        if (path.basename(c, '.js') === plugin_file) {
          delete require.cache[c];
        }
      });
      var plugin = require('./' + plugin_file);
      plugin.bot = this;
      if (typeof prefix === 'string') plugin.prefix = prefix;
      this.plugins[plugin_file] = plugin;
      console.log("Loaded plugin " + plugin_file);
      if (typeof plugin.init === 'function') plugin.init();
      return true;
    } catch (e) {
      // can't find it
      console.log(e);
      console.warn("Warning: Can't find plugin " + plugin_file);
      return false;
    }
  },

  get_plugin: function(name) {
    var plugin;
    this.plugin_any(function(p) {
      if (p.name === name) {
        plugin = p;
        return true;
      }
    });
    return plugin;
  },

  listeners: {
    'message': function(nick, to, text, message) {
      var handler = this.get_handler(text);
      if (!handler || typeof handler.command.response !== 'function') return;
      extend(handler, {
        bot: this,
        nick: nick,
        reply: (to === this.main_nick ? nick : to)
      });
      return handler.command.response.call(handler.plugin, handler);
    },
    'join': function(channel, nick, message) {
      if (nick !== this.main_nick) return;
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
      if (nick === this.main_nick) this.kicked_flag = true;
    }
  },

  say_phrase: function(target, string_key) {
    if (typeof string_key !== 'string' || !this.sayings[string_key]) {
      console.log("GRR INVALID STRING KEY! " + string_key.toString());
      return;
    }
    arguments[1] = this.sayings[string_key];
    return this.say_text.apply(this, arguments);
  },

  say_text: function(target, text) {
    var args = Array.prototype.slice.call(arguments, 2);
    var linepos = 0;
    if (args.length > 0) text = vsprintf(text, args);
    if (typeof this.say_transform === 'function') {
      text = this.say_transform(text);
    }
    if (this.max_line_length) {
      text = this.split_line(text, this.max_line_length);
    }
    text.split("\n").forEach(function(e) {
      this.client.say(target, e);
    }, this);
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

  save_data: function() {
    try {
      fs.writeFile(this.savefile, JSON.stringify(this.saved, null, 1));
      return true;
    } catch (e) {
      console.log("Could not save file! " + this.savefile);
      console.log(e);
      return false;
    }
  },

  load_data: function() {
    if (!fs.existsSync(this.savefile)) {
      this.saved = {};
      return;
    }
    this.saved = JSON.parse(fs.readFileSync(this.savefile));
  },

  get_saved: function(key, name) {
    if (typeof key !== 'string') return;
    var out = this.saved[key.toLowerCase()];
    if (typeof name === 'string') {
      return out[name.toLowerCase()];
    } 
    return out;
  },

  store_saved: function(key, name, data) {
    if (typeof key !== 'string') return;
    if (typeof name !== 'string') return;
    key = key.toLowerCase();
    name = name.toLowerCase();
    if (typeof this.saved[key] !== 'object') this.saved[key] = {};
    if (typeof data !== 'undefined') { 
      this.saved[key][name] = data;
    } else {
      delete this.saved[key][name];
    }
    return this.save_data();
  },

  delete_saved: function(key, name) {
    return this.store_saved(key, name);
  }

};

module.exports = Bot;
