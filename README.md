OCTOTROG.JS
-----------

Based off the original OCTOTROG written in Perl by shmup:
https://github.com/shmup/octotrog

The Perl version wasn't terribly maintainable, so I rewrote it using Node and
the nodeirc library, which is much more flexible.

The bot's main function is to send commands from an IRC channel to a pantheon
of infobots on another server, and relay the response back.

Instructions:

 * Edit `octotrog.js` and set `server` and `main_channel`
 * Run `sqlite3 db/save.db < db/schema.sql` to initialize the database
 * `npm install`
 * `npm start`
