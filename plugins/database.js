"use strict";
var foreach = require('foreach');
var sprintf = require('sprintf');
var sqlite3 = require('sqlite3');
var Promise = require('bluebird');
var db_path = './db/save.db';

module.exports = {
  name: 'database',
  prefix: '',

  init: function() {
    this.db = new (sqlite3.verbose().Database)(db_path);
    this.db.addListener('error', function(e) {
      this.log_error(e, 'Database error');
    });
    if (this.debug) {
      this.db.addListener('profile', function(sql, time) {
        this.log.debug('Query complete (' + time, 'ms):', sql);
      }.bind(this));
    }
  },

  listeners: {
    'db_insert': function(resolver, table, o, obj_keys) {
      if (
        typeof o !== 'object' ||
        typeof table !== 'string'
      ) return resolver(Promise.reject('Bad parameters'));
      if (!Array.isArray(obj_keys)) {
        obj_keys = Object.keys(o);
      }
      var keys = [], placeholders = [], values = [], c = 1;
      obj_keys.forEach(function(k) {
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
        resolver(this.emitP('db_run', query, values));
      }
    },
    'db_run': function(resolver) {
      var args = Array.prototype.slice.call(arguments, 1);
      resolver(Promise.promisify(this.db.run).apply(this.db, args));
    },
    'db_call': function(resolver, func) {
      if (typeof this.db[func] !== 'function') {
        return Promise.reject('Invalid DB call: ' + func);
      }
      var args = Array.prototype.slice.call(arguments, 2);
      resolver(Promise.promisify(this.db[func]).apply(this.db, args));
    }
  }

};
