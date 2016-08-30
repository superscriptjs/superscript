
# SuperScript

SuperScript is a dialog system + bot engine for creating human-like conversation chat bots. It exposes an expressive script for crafting dialogue and features text-expansion using wordnet and Information Retrieval and extraction using ConceptNet.

## What comes in the box

* Dialog Engine
* Multi-User Platform for easy integration with Group Chat systems
* Message Pipeline with POS Tagging, Sentence Analyses and Question Tagging
* Extensible Plugin Architecture

## Install

    npm install superscript

## Getting Started

Check out the [`hello-superscript`](https://github.com/silentrob/hello-superscript) repo for a clean starting point to building your own bot.

## NOTE 0.12.0 

This version is designed to work with Node 0.12 and Node 5.5.0 and up to 5.latest 
You may need to reinstall your node_modules folder.

    `npm install`
    `npm update`

Then manually extract the WordNet dictionary: 

    `cd node_modules/wordnet-db`
    `node unpack.js WNdb-3.1.tar.gz`

    and if you run the tests.

    `cd node_modules/wndb-with-exceptions`
    `node unpack.js WNdb-3.0.tar.gz`

## Documentation

Visit [superscriptjs.com](http://superscriptjs.com) for all the details on how to get started playing with SuperScript. Or [read the wiki](https://github.com/silentrob/superscript/wiki)

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


### Additonal Resources

* [Sublime Text Syntax Highlighting](https://github.com/mariusursache/superscript-sublimetext)
* [Atom Syntax Highlighting](https://github.com/DBozhinovski/language-superscript)
*

### Further Reading

* [Introducing SuperScript](https://medium.com/@rob_ellis/superscript-ce40e9720bef) on Medium
* [Creating a Chatbot](https://medium.com/@rob_ellis/creating-a-chat-bot-42861e6a2acd) on Medium
* [Custom Slack chatbot tutorial](https://medium.com/@rob_ellis/slack-superscript-rise-of-the-bots-bba8506a043c) on Medium
* [SuperScript the big update](https://medium.com/@rob_ellis/superscript-the-big-update-3fa8099ab89a) on Medium
* [Full Documentation](https://github.com/silentrob/superscript/wiki)
* Follow [@rob_ellis](https://twitter.com/rob_ellis)

### Further Watching

* [Talking to Machines EmpireJS](https://www.youtube.com/watch?v=uKqO6HCKSBg)

## Thanks

SuperScript is based off of a fork of RiveScript with idiom brought in from ChatScript. Without the work of Noah Petherbridge and Bruce Wilcox, this project would not be possible.

## License

[The MIT License (MIT)](LICENSE.md)

Copyright © 2014-2016 Rob Ellis
