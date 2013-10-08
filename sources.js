"use strict";
var sources =
{
  "$self": {
    "type": "self",
    "commands": [
      {
        "command": "!playing",
        "description": "Show who on the watchlist is currently playing."
      },
      {
        "command": "!watch",
        "description": "Watch a user. (Crawl name, NOT IRC nick!)"
      },
      {
        "command": "!unwatch",
        "description": "Unwatch a user. (Crawl name, NOT IRC nick!)"
      },
      {
        "command": "!watched",
        "description": "Show list of watched users."
      },
      {
        "command": "!help",
        "description": "Pretty self-explanatory, isn't it?"
      }
    ]
  },
  "Sizzell": {
    "type": "relay",
    "commands": [
      {
        "command": "%whereis",
        "add_nick": true,
        "description": "Lists where a player currently is in the dungeon. (crawl.s-z.org)"
      },
      {
        "command": "%dump",
        "add_nick": true,
        "description": "Gives an URL to the specified user's last character dump. (crawl.s-z.org)"
      }
    ]
  },
  "Gretell": {
    "type": "relay",
    "commands": [
      {
        "command": "@??",
        "no_space": true,
        "description": "Usage: @?? <monster name>"
      },
      {
        "command": "@whereis",
        "add_nick": true,
        "description": "Lists where a player currently is in the dungeon. (crawl.develz.org)"
      },
      {
        "command": "@dump",
        "add_nick": true,
        "description": "Gives an URL to the specified user's last character dump. (crawl.develz.org)"
      }
    ]
  },
  "Sequell": {
    "type": "relay",
    "commands": [
      {
        "command": "!chars",
        "add_nick": true,
        "description": "Lists the frequency of all character types a player started."
      },
      {
        "command": "!gamesby",
        "add_nick": true,
        "description": "Summarizes a player's public server career."
      },
      {
        "command": "!gkills",
        "add_nick": true,
        "description": "Lists the top kills for a player's ghost."
      },
      {
        "command": "!hs",
        "add_nick": true,
        "description": "Lists the highest-scoring game for a player."
      },
      {
        "command": "!killsby",
        "description": "Lists the most frequent victims for a given monster. Use -i to show indirect kills (e.g. rat summoned by vampire)."
      },
      {
        "command": "!lg",
        "add_nick": true,
        "description": "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !lg (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info."
      },
      {
        "command": "!listgame",
        "add_nick": true,
        "description": "Lists games matching specified conditions. By default it lists the most recent game played by the invoker. Usage: !listgame (<player>) (<gamenumber>) (options) where options are in the form field=value, or (max|min)=field. See ??listgame or http://is.gd/sequell_lg for more info."
      },
      {
        "command": "!log",
        "add_nick": true,
        "description": "Gives a URL to the user's last morgue file. Accepts !listgame style selectors."
      },
      {
        "command": "%rc",
        "add_nick": true,
        "description": "Gives a URL to the user's rc file."
      },
      {
        "command": "!streak",
        "add_nick": true,
        "description": "Show's a player's winning streak (or lack thereof)."
      },
      {
        "command": "!ttr",
        "add_nick": true,
        "description": "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors."
      },
      {
        "command": "!ttyrec",
        "add_nick": true,
        "description": "Supplies URLs to the user's last ttyrecs. Accepts !listgame style selectors."
      },
      {
        "command": "!tv",
        "description": "Usage: !tv <game>. Plays the game on FooTV."
      },
      {
        "command": "!won",
        "add_nick": true,
        "description": "Shows the number of games won. Usage: !won <nick> [<number of wins to skip>]"
      }
    ]
  },
  "Henzell": {
    "type": "relay",
    "commands": [
      {
        "command": "??",
        "no_space": true,
        "description": "Look up an entry in LearnDB."
      },
      {
        "command": "!abyss",
        "add_nick": true,
        "description": "Use with caution."
      },
      {
        "command": "!apt",
        "description": "Looks up aptitudes for specified race/skill combination."
      },
      {
        "command": "!dump",
        "add_nick": true,
        "description": "Gives an URL to the specified user's last character dump. (crawl.akrasiac.org)"
      },
      {
        "command": "!ftw",
        "description": "Abbreviates race/role abbreviations. Example usage: !ftw Troll Berserker"
      },
      {
        "command": "!rng",
        "description": "Chooses randomly between its (space-separated) arguments. Accepts @god, @char, @role, and @race special arguments. Prefixing the special argument with 'good' or 'bad' limits the choices to only unrestricted or only restricted combos, respectively. @role=<role> or @race=<race> chooses a random combo with the specified role/race."
      },
      {
        "command": "!time",
        "description": "Shows the UTC time on crawl.akrasiac.org."
      },
      {
        "command": "!whereis",
        "add_nick": true,
        "description": "Lists where a player currently is in the dungeon. (crawl.akrasiac.org)"
      },
      {
        "command": "!wtf",
        "description": "Expands race/role abbreviations. Example usage: !wtf TrBe"
      }
    ]
  }
};

module.exports = sources;
