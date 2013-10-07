"use strict";
var sources =
{
  "$self": {
    "type": "self",
    "commands": [
      {
        "command": "!playing",
        "description": ""
      },
      {
        "command": "!watch",
        "description": ""
      },
      {
        "command": "!unwatch",
        "description": ""
      },
      {
        "command": "!watched",
        "description": ""
      },
      {
        "command": "!help",
        "description": ""
      }
    ]
  },
  "Sizzell": {
    "type": "relay",
    "commands": [
      {
        "command": "%whereis",
        "description": ""
      },
      {
        "command": "%dump",
        "description": ""
      }
    ]
  },
  "Gretell": {
    "type": "relay",
    "commands": [
      {
        "command": "@??",
        "description": ""
      },
      {
        "command": "@whereis",
        "description": ""
      },
      {
        "command": "@dump",
        "description": ""
      }
    ]
  },
  "Sequell": {
    "type": "relay",
    "commands": [
      {
        "command": "!chars",
        "description": ""
      },
      {
        "command": "!cmd",
        "description": ""
      },
      {
        "command": "!cmdinfo",
        "description": ""
      },
      {
        "command": "!deathsin",
        "description": ""
      },
      {
        "command": "!gamesby",
        "description": ""
      },
      {
        "command": "!gkills",
        "description": ""
      },
      {
        "command": "!help",
        "description": ""
      },
      {
        "command": "!hs",
        "description": ""
      },
      {
        "command": "!keyworddef",
        "description": ""
      },
      {
        "command": "!killratio",
        "description": ""
      },
      {
        "command": "!killsby",
        "description": ""
      },
      {
        "command": "!kw",
        "description": ""
      },
      {
        "command": "!lg",
        "description": ""
      },
      {
        "command": "!listgame",
        "description": ""
      },
      {
        "command": "!lm",
        "description": ""
      },
      {
        "command": "!locateall",
        "description": ""
      },
      {
        "command": "!log",
        "description": ""
      },
      {
        "command": "!nchoice",
        "description": ""
      },
      {
        "command": "!nick",
        "description": ""
      },
      {
        "command": "%rc",
        "description": ""
      },
      {
        "command": "!streak",
        "description": ""
      },
      {
        "command": "!title",
        "description": ""
      },
      {
        "command": "!ttr",
        "description": ""
      },
      {
        "command": "!ttyrec",
        "description": ""
      },
      {
        "command": "!tv",
        "description": ""
      },
      {
        "command": "!tvdef",
        "description": ""
      },
      {
        "command": "!won",
        "description": ""
      }
    ]
  },
  "Henzell": {
    "type": "relay",
    "commands": [
      {
        "command": "??",
        "description": ""
      },
      {
        "command": "!abyss",
        "description": ""
      },
      {
        "command": "!apt",
        "description": ""
      },
      {
        "command": "!cdefine",
        "description": ""
      },
      {
        "command": "!cheers",
        "description": ""
      },
      {
        "command": "!cmdinfo",
        "description": ""
      },
      {
        "command": "!coffee",
        "description": ""
      },
      {
        "command": "!dump",
        "description": ""
      },
      {
        "command": "!echo",
        "description": ""
      },
      {
        "command": "!ftw",
        "description": ""
      },
      {
        "command": "!function",
        "description": ""
      },
      {
        "command": "!help",
        "description": ""
      },
      {
        "command": "!idle",
        "description": ""
      },
      {
        "command": "!learn",
        "description": ""
      },
      {
        "command": "!macro",
        "description": ""
      },
      {
        "command": "!messages",
        "description": ""
      },
      {
        "command": "!nick",
        "description": ""
      },
      {
        "command": "!rc",
        "description": ""
      },
      {
        "command": "!rng",
        "description": ""
      },
      {
        "command": "!seen",
        "description": ""
      },
      {
        "command": "!send",
        "description": ""
      },
      {
        "command": "!skill",
        "description": ""
      },
      {
        "command": "!source",
        "description": ""
      },
      {
        "command": "!tell",
        "description": ""
      },
      {
        "command": "!time",
        "description": ""
      },
      {
        "command": "!vault",
        "description": ""
      },
      {
        "command": "!whereis",
        "description": ""
      },
      {
        "command": "!wtf",
        "description": ""
      }
    ]
  },
  "apocalypsebot": {
    "type": "relay",
    "commands": [
      {
        "command": "!time",
        "description": ""
      }
    ]
  },
  "Cheibriados": {
    "type": "relay",
    "commands": [
      {
        "command": "%??",
        "description": ""
      }
    ]
  }
};

module.exports = sources;
