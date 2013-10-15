"use strict";

module.exports = {
  name: 'main',
  prefix: '!',
  commands: {
    'reload': {
      description: "Reload a plugin module.",
      response: function(opt) {
        if (this.bot.load_plugin(opt.params[0])) {
          this.bot.say_text(opt.reply, 'Successfully reloaded module: %s', opt.params[0]);
        } else {
          this.bot.say_text(opt.reply, "Couldn't reload module: %s", opt.params[0]);
        }
      }
    },
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
        this.bot.plugin_every(function(p) {
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
