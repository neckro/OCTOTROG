var foreach = require('foreach');
var extend = require('extend');
require('date-utils');

var Logger = module.exports = function Logger(config, target, prefix) {
  this.config = config;
  this.target = target;
  this.prefix = prefix;
};
var listeners;

extend(Logger.prototype, {
  attach: function(target, prefix) {
    if (typeof prefix === 'string') {
      prefix = (this.prefix ? this.prefix + ' ' : '') + prefix;
    }
    return new Logger(this.config, target, prefix);
  },

  debug: function() {
    if (this.target && this.target.debug) return this.logger.call(this, arguments, console.log);
  },

  error: function() {
    return this.logger.call(this, arguments, console.warn);
  },

  logger: function(in_data, log_func) {
    var out_text = [(new Date()).toFormat('YYYY-MM-DD HH:MI:SS')];
    if (typeof this.prefix === 'string') out_text.push(this.prefix);
    var out_objs = [];
    for (var i = 0; i < in_data.length; i++) {
      if (typeof in_data[i] === 'object') {
        out_objs.push(in_data[i]);
      } else if (typeof in_data[i] !== 'undefined') {
        out_text.push(in_data[i]);
      }
    }
    return log_func.apply(this, out_text.concat(out_objs));
  },

  bind_listeners: function(emitter, type) {
    foreach(listeners[type], function(e, i) {
      emitter.addListener(i, e.bind(this.target));
    }, this);
  }

});

listeners = {
  // Listeners to attach to a node-irc emitter
  irc: {
    'raw': function(message) {
      // 37x = MOTDs; skip them
      if (message.rawCommand.match(/(PRIVMSG)|(PING)|(37\d)/)) return;
      this.log.debug(
        'IRC',
        message.rawCommand,
        message.args.slice(1).join(' ')
      );
    },
    // This is undocumented in node-irc
    'selfMessage': function(to, msg) {
      this.log.debug(
        'IRC >',
        '[' + to + ']',
        msg
      );
    },
    'pm': function(nick, text, message) {
      this.log.debug(
        'IRC',
        '<' + nick + '>',
        text
      );
    }
  }
};
