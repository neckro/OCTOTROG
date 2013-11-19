"use strict";
var sprintf = require('sprintf').sprintf;
var foreach = require('foreach');

module.exports = {
  name: "OCTOTROG",
  prefix: "",

  commands: {
    "!dbadd": {
      description: "!dbadd <term> <entry>: Add an entry to the database. Use {braces} if term is multiple words!",
      response: function(opt) {
        var parsed = opt.msg.match(/^((\{(.+)\})|([^ ]+)) (.*)$/);
        if (!parsed || parsed.length < 5) {
          opt.reply('Trog smash bad entry.');
          return;
        }
        var term = (parsed[4] || parsed[3]).toLowerCase();
        var def = parsed[5];
        this.bot.db.run('REPLACE INTO dictionary (term, def) VALUES (?, ?)', term, def, function(e) {
          if (e === null) {
            opt.reply('Trog save entry for %s.', term);
          } else {
            console.warn('dbadd error:', e);
            opt.reply('Trog have enraging problem saving entry for %s.', term);
          }
        });
      }
    },
    "!dbremove": {
      description: "Remove an entry from the database.",
      response: function(opt) {
        var term = opt.msg.toLowerCase();
        this.bot.db.run('DELETE FROM dictionary WHERE term = ?', opt.msg, function(e) {
          if (e === null) {
            opt.reply('Trog destroy entry for %s.', term);
          } else {
            console.warn('dbremove error:', e);
            opt.reply('Trog no see entry for %s.', term);
          }
        });
      }
    },
    "!dblist": {
      description: "List all terms in the database.",
      response: function(opt) {
        this.bot.db.all('SELECT term FROM dictionary ORDER BY term', function(e, result) {
          var terms = '';
          if (e !== null) {
            console.warn('dblist error:', e);
            return;
          }
          foreach(result, function(r) {
            if (typeof r.term === 'string') terms += '{' + r.term + '} ';
          });
          opt.reply(terms);
        });
      }
    },
    "?!": {
      description: "Show an entry from the OCTOTROG database.  Use !dbadd to add new terms.",
      no_space: true,
      response: function(opt) {
        var term = opt.msg.trim();
        if (term.length && term.length > 0) {
          this.bot.db.get('SELECT def FROM dictionary WHERE term = ?', term, function(e, r) {
            if (e === null && r && typeof r.def === 'string') {
              opt.reply(false, '{%s}: %s', term.toUpperCase(), r.def);
            } else {
              opt.reply('No definition for %s', term);
            }
          });
        }
      }
    }
  }
};
