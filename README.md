OCTOTROG.JS
-----------

Based off the original OCTOTROG written in Perl by shmup:
https://github.com/shmup/octotrog

The Perl version wasn't terribly maintainable, so I rewrote it using Node and
the nodeirc library, which is much more flexible.

The bot's main function is to send commands from an IRC channel to a pantheon
of infobots on another server, and relay the response back.

I've made a half-hearted attempt to separate the relay functionality from
general bot functions, but it still needs work.

Instructions:

 * Edit `octotrog.js` and set `main_server` and `main_channel`
 * `npm install`
 * `npm start`
