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
        this.dispatch('db_run', 'REPLACE INTO dictionary (term, def) VALUES (?, ?)', term, def)
        .then(function(v) {
          opt.reply('Trog save entry for %s.', term);
        })
        .catch(function(e) {
          opt.reply_phrase('database_error');
        });
      }
    },
    "!dbremove": {
      description: "Remove an entry from the database.",
      response: function(opt) {
        var term = opt.msg.toLowerCase();
        this.dispatch('db_run', 'DELETE FROM dictionary WHERE term = ?', opt.msg)
        .then(function(v) {
          opt.reply('Trog destroy entry for %s.', term);
        })
        .catch(function(e) {
          opt.reply_phrase('database_error');
        });
      }
    },
    "!dblist": {
      description: "List all terms in the database.",
      response: function(opt) {
        this.dispatch('db_call', 'all', 'SELECT term FROM dictionary ORDER BY term')
        .then(function(v) {
          if (v.length === 0) return;
          var terms = '';
          foreach(v, function(r) {
            if (typeof r.term === 'string') terms += '{' + r.term + '} ';
          });
          opt.reply(terms);
        })
        .catch(function(e) {
          opt.reply_phrase('database_error');
        });
      }
    },
    "?!": {
      description: "Show an entry from the OCTOTROG database.  Use !dbadd to add new terms.",
      no_space: true,
      response: function(opt) {
        var term = opt.msg.trim();
        if (term.length && term.length > 0) {
          this.dispatch('db_call', 'get', 'SELECT def FROM dictionary WHERE term = ?', term)
          .then(function(v) {
            if (v && typeof v.def === 'string') {
              opt.reply(false, '{%s}: %s', term.toUpperCase(), v.def);
            } else {
              opt.reply('No definition for {%s}', term);
            }
          })
          .catch(function(e) {
            opt.reply_phrase('database_error');
          });
        }
      }
    }
  }
};
