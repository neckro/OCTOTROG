# OCTOTROG.JS

Based on the original OCTOTROG bot written in Perl by shmup:
https://github.com/shmup/octotrog

The Perl version wasn't terribly maintainable, so I rewrote it using Node and
the nodeirc library, which is much more flexible.

The bot's main function is to send commands from an IRC channel to a pantheon
of infobots on another server, and relay the response back.

## Dependencies:

 * Node
 * SQLite 3 dev headers (Debian/Ubuntu package `libsqlite3-dev`)

## Basic instructions:

 * Edit `octotrog.js` and set `server` and `main_channel`
 * Run `sqlite3 db/save.db < db/schema.sql` to initialize the database
 * `npm install`
 * `npm start`

# API

This is my first attempt at an IRC bot, please bear with me.  I've documented
the main functionality here.

## ircbot

#### new ircbot(bot_options : object)

See `octotrog.js` for an example of instantiating a bot and loading plugins.

`bot_options` are in flux and not yet documented.

#### ircbot.load_plugin(plugin_file : string, [options : object])

Currently the bot only looks in the `plugins` subdirectory for plugin scripts.
`options` is passed to the plugin's initializer.

## plugin (core)

Core plugin functionality.  An attempt (not entirely successful) has been made
to allow plugins to function without directly accessing the `ircbot` object.
Therefore, all communication with `ircbot` is handled through the core plugin.

#### plugin.bot

The `ircbot` instance.

#### plugin.log.debug([...message : any])

Prints debug info to the Node console log, if `bot.debug` is set to `true`.

#### plugin.log.error([...message : any])

Prints an error to the Node console log, with timestamp.

#### plugin.bind_channels(channels : array<string>)

Bind one or more IRC channels to the plugin.  The plugin will then receive
messages from this channel.  The `say` methods will message these channels as
well.

#### plugin.emitP(resolver : function, [...params : any])

The core of plugin communication.  Used by a plugin to emit an event to itself.
The first parameter sent to the event is a function that can be used to
(optionally) resolve the event's promise.

Returns a promise for the event.

#### plugin.dispatch(event : string, [...params : any])

Calls `plugin.emitP` on every plugin that is registered, in the order they were
registered.

Returns a promise that resolves when *any* plugin's event handler resolves the
promise.  (This is currently a weakness of the plugin event system.)

#### plugin.say(message : string, [...params : any])

Sends a message to each channel the plugin is bound to.  An arbitrary number of
`sprintf`-style arguments are allowed.

#### plugin.say_phrase(phrase_name : string, [...params : any])

Same as `plugin.say`, except a stock bot phrase is used.

#### plugin.color_wrap(message : string, color : integer)

Utility function to wrap a string in an IRC color.

## plugin (extensions)

These should be defined in your plugin file.

#### plugin.name : string

The plugin's name.  Currently this is only used for logging.

#### plugin.init(options : object)

Called when the plugin is loaded.

#### plugin.destroy()

Called when the plugin is unloaded.  Custom event listeners that weren't bound
to the plugin directly should be destroyed here.

#### plugin.prefix : string

The prefix for this plugin's commands.  This is to make it easy to change
without modifying all of the commands.

#### plugin.commands : object { [command]: handler : object }

The main way to implement IRC commands.  This is a hash of commands and
command handlers.  The following options are implemented:

 * `no_space : boolean`

 Allow the command to be matched with no space between the command and its parameters.
Defaults to `false` (space is required).

 * `description : string`

 A description of the command.  Used by the default `!help` command.

 * `response : function(info : object)`

 The responder function that is called when this command is received.  The
`info` object contains the following data:

  * `bot : ircbot` - The `ircbot` instance.
  * `command : string` - The command that was parsed.
  * `from : string` - The nick/channel the IRC message arrived from.
  * `handler : object` - The command handler.
  * `privmsg : boolean` - Was this a PRIVMSG to the bot?
  * `text : string` - The full text of the message.
  * `to : string` - The nick/channel the IRC message was sent to.
  * `message : object` - The `message` object received from `node-irc`.
  * `msg : string` - The message minus the parsed command.
  * `params : array<string>` - This is `msg` split into an array, by spaces.
  * `reply : function(text : string)` - A function that can be used to reply
    to the message.
  * `reply_phrase : function(phrase : string, [...params])` - A function that
    can be used to reply to the message using a bot phrase.

#### plugin.listeners : object { [event]: listener(resolver : function, [...params : any]) }

Hash of event names and listeners.  These are bound to the plugin on load.
Currently you can't bind more than one listener to an event.

Event listeners are called with a resolver function as the first argument,
which can be used to resolve the event's promise.

## Not yet documented

 * Main plugin
 * Crawl/database plugins
 * Phrases
 * Transformer
 * Expect queue

## Todo

 * Rethink plugin-channel binding
 * Rethink event promises
 * Find better solution for expect queue
 * Separate ircbot repository from Crawl plugin
