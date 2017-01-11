[![Build Status](https://travis-ci.org/superscriptjs/superscript.svg?branch=master)](https://travis-ci.org/superscriptjs/superscript)
[![Dependencies Status](https://david-dm.org/superscriptjs/superscript.svg)](https://david-dm.org/superscriptjs/superscript)
[![Slack Chat](https://superscript-slackin.herokuapp.com/badge.svg)](https://superscript-slackin.herokuapp.com/)
[![Code Climate](https://codeclimate.com/github/silentrob/superscript/badges/gpa.svg)](https://codeclimate.com/github/silentrob/superscript)

# SuperScript

SuperScript is a dialog system and bot engine for creating human-like conversation chat bots. It exposes an expressive script for crafting dialogue and features text-expansion using WordNet and information retrieval using a fact system built on a [Level](https://github.com/Level/level) interface.

Note: This version (v1.x) is designed to work with and tested against the latest Node 6.x and above.

## Why SuperScript?

SuperScript's power comes in its topics and conversations, which mimic typical human conversations. If you're looking to create complex conversations with branching dialogue, or recreate the natural flow of talking about different topics, SuperScript is for you!

## What comes in the box

* Dialog engine.
* Multi-user platform for easy integration with group chat systems like Slack.
* Message pipeline with NLP tech such as POS tagging, sentence analysis and question tagging.
* Extensible plugin architecture to call your own APIs or do your own NLP if you want to!
* A built in graph database using LevelDB. Each user has their own sub-level, allowing you to define complex relationships between entities.
* [WordNet](http://wordnet.princeton.edu/), a database for word and concept expansion.

## Install

    npm install superscript

## Getting Started

### bot-init

If you've installed superscript globally (`npm install -g superscript`), a good way to get your new bot up and running is by running the `bot-init` script:

    bot-init myBotName --clients telnet,slack

This will create a bot in a new 'myBotName' folder in your current directory. You can specify the clients you want with the `--clients` flag (currently bot-init only supports Slack and Telnet).

Then all you need to do is run:

```
cd myBotName
npm install
parse
npm run build
npm run start
```

The `parse` step is another script that will compile your SuperScript script. By default, it will look at the `chat` folder in your current directory.

### Clone a template

Alternatively, check out the [`hello-superscript`](https://github.com/silentrob/hello-superscript) repo for a clean starting point to building your own bot. There's no guarantee at present that this is using the latest version of SuperScript.

## Upgrading to v1.x

Information on upgrading to v1.x can be found [on the wiki](https://github.com/superscriptjs/superscript/wiki/Upgrading_to_v1).

## Documentation

Visit [superscriptjs.com](http://superscriptjs.com) for all the details on how to get started playing with SuperScript. Or [read the wiki](https://github.com/superscriptjs/superscript/wiki)

### Example Script - Script Authoring

    + hello human
    - Hello Bot

`+` matches all input types

`-` Is the reply sent back to the user.


### Optional and Alternates - Script Authoring

    + [hey] hello (nice|mean) human
    - Hello Bot

`[]` are for optional words, they may or may not appear in the input match

`()` are alternate words. One MUST appear.

### Capturing results - Script Authoring (wildcards)

    + * should *~2 work *1
    - I have no idea.

`*` Matches ZERO or more words or tokens

`*~n` Matches ZERO to N words or tokens

`*n` Matches exactly N number of words or tokens


## And More

The above is just a tiny fraction of what the system is capable of doing. Please see the [full documentation](http://superscriptjs.com) to learn more.


### Additional Resources

* [Sublime Text Syntax Highlighting](https://github.com/mariusursache/superscript-sublimetext)
* [Atom Syntax Highlighting](https://github.com/DBozhinovski/language-superscript)

### Further Reading

* [Introducing SuperScript](https://medium.com/@rob_ellis/superscript-ce40e9720bef) on Medium
* [Creating a Chatbot](https://medium.com/@rob_ellis/creating-a-chat-bot-42861e6a2acd) on Medium
* [Custom Slack chatbot tutorial](https://medium.com/@rob_ellis/slack-superscript-rise-of-the-bots-bba8506a043c) on Medium
* [SuperScript the big update](https://medium.com/@rob_ellis/superscript-the-big-update-3fa8099ab89a) on Medium
* [Full Documentation](https://github.com/superscriptjs/superscript/wiki)
* Follow [@rob_ellis](https://twitter.com/rob_ellis)

### Further Watching

* [Talking to Machines EmpireJS](https://www.youtube.com/watch?v=uKqO6HCKSBg)

## Thanks

SuperScript is based off of a fork of RiveScript with idiom brought in from ChatScript. Without the work of Noah Petherbridge and Bruce Wilcox, this project would not be possible.

## License

[The MIT License (MIT)](LICENSE.md)

Copyright © 2014-2017 Rob Ellis
