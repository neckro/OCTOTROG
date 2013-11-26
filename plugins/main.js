"use strict";
var foreach = require('foreach');

module.exports = {
  name: 'main',
  prefix: '!',

  commands: {
    'reload': {
      description: "Reload a plugin module.",
      response: function(opt) {
        if (typeof opt.params[0] === 'string' && opt.bot.load_plugin(opt.params[0])) {
          opt.reply("Successfully reloaded module: %s", opt.params[0]);
        } else {
          opt.reply("Couldn't reload module: %s", opt.params[0]);
        }
      }
    },
    'help': {
      description: "Pretty self-explanatory, isn't it?",
      response: function(opt) {
        var helpcmd = opt.params[0];
        if (typeof helpcmd === 'string') helpcmd = helpcmd.trim().toLowerCase();
        var response;
        var cmds = [];
        opt.bot.each_plugin(function() {
          foreach(this.command_map, function(o, c) {
            c = c.trim();
            if (c.toLowerCase() === helpcmd) response = o.description;
            cmds.push(c);
          });
        });
        if (response) {
          opt.reply(helpcmd + ': ' + response);
        } else if (helpcmd) {
          opt.reply_phrase('help_not_available', helpcmd);
        } else {
          opt.reply_phrase('help', cmds.sort().join(' '));
        }
      }
    }
  }
};
