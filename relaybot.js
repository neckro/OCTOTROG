"use strict";
var fs = require('fs');
var irc = require('irc');
var extend = require('extend');
var vsprintf = require('sprintf').vsprintf;

var defaults = {
  max_line_length: 300,
  irc_options: {
    stripColors: false,
    floodProtection: true
  }
};

var relaybot = {
  create: function(opt) {
    var bot = Object.create(relaybot);

    // Add plugins
    bot.plugins = [default_plugin].concat(opt.plugins || []);
    if (opt.plugins) delete opt.plugins;
    bot.plugins.forEach(function(p) {
      p.bot = bot;
    });

    extend(true, bot, defaults, opt);

    // other default handling
    bot.relay_nick = bot.relay_nick || bot.main_nick;
    bot.irc_options.channels = [opt.main_channel];
    bot.main_client = new irc.Client(bot.main_server, bot.main_nick, bot.irc_options);
    bot.irc_options.channels = [opt.relay_channel];
    bot.relay_client = new irc.Client(bot.relay_server, bot.relay_nick, bot.irc_options);

    // load JSON file
    bot.load_data();

    Object.keys(bot.main_listeners).forEach(function(l) {
      bot.main_client.addListener(l, bot.main_listeners[l].bind(bot));
    });
    Object.keys(bot.relay_listeners).forEach(function(l) {
      bot.relay_client.addListener(l, bot.relay_listeners[l].bind(bot));
    });
    // TODO: detect nick change?
    return bot;
  },

  get_handler: function(text) {
    var handler;
    if (!Array.isArray(this.plugins)) return;
    if (typeof text !== 'string' || text.length === 0) return;
    text = text.toLowerCase() + ' ';

    this.plugins.some(function(plugin) {
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
            params = text.substr(test.length).trim().split(/ +/);
            if (params[0] === '') params = [];
            handler = {
              command: plugin.commands[cmd],
              plugin: plugin,
              action: prefix + cmd,
              params: params,
              fulltext: text
            };
            return true;
          }
        });
      }
    });
    return handler;
  },

  get_plugin: function(name) {
    var plugin;
    this.plugins.some(function(p) {
      if (p.name === name) {
        plugin = p;
        return true;
      }
    });
    return plugin;
  },

  main_listeners: {
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

  relay_listeners: {
    'message': function(nick, to, text, message) {
      this.plugins.some(function(plugin) {
        if (typeof plugin.relay_listener === 'function') {
          plugin.relay_listener.call(plugin, nick, to, text);
        }
      });
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
      this.main_client.say(target, e);
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
  }

};

var default_plugin = {
  prefix: '!',
  commands: {
    'help': {
      description: "Pretty self-explanatory, isn't it?",
      response: function(opt) {
        var cmdlist = [], handler;
        if (opt.params.length > 0) {
          // Show command help
          handler = this.bot.get_handler(opt.params[0]);
          if (handler) {
            if (handler.command.description) {
              this.bot.say_text(opt.reply, opt.params[0] + ' - ' + handler.command.description);
            } else {
              this.bot.say_phrase(opt.reply, 'help_not_available', opt.params[0]);
            }
          } else {
            this.bot.say_phrase(opt.reply, 'help_not_found', opt.params[0]);
          }
          return;
        }

        // Show all commands
        this.bot.plugins.forEach(function(p) {
          if (typeof p.commands !== 'object') return;
          Object.keys(p.commands).forEach(function(c) {
            cmdlist.push((p.prefix || '') + c);
          });
        });

        this.bot.say_phrase(opt.reply, 'help', cmdlist.sort().join(' '));
      }
    }
  }
};

module.exports = relaybot;
