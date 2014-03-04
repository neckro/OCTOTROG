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
      console.warn('db error', e);
    });
  },

  listeners: {
    'db_insert': function(deferred, table, o, obj_keys) {
      if (
        typeof o !== 'object' ||
        typeof table !== 'string'
      ) return deferred.reject();
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
        deferred.resolve(this.emitP('db_run', query, values));
      }
    },
    'db_run': function(deferred) {
      var args = Array.prototype.slice.call(arguments, 1);
      deferred.resolve(Promise.promisify(this.db.run).apply(this.db, args));
    },
    'db_call': function(deferred, func) {
      if (typeof this.db[func] !== 'function') return deferred.reject();
      var args = Array.prototype.slice.call(arguments, 2);
      deferred.resolve(Promise.promisify(this.db[func]).apply(this.db, args));
    }
  }

};
