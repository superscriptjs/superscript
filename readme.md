[![Build Status](https://travis-ci.org/silentrob/superscript.svg?branch=master)](https://travis-ci.org/silentrob/superscript)
[![Slack chat](https://superscript-slackin.herokuapp.com/badge.svg)](https://superscript-slackin.herokuapp.com//badge.svg)
# SuperScript

SuperScript is a dialog system + bot engine for creating human-like conversation chat bots. It exposes an expressive script for crafting dialogue and features text-expansion using wordnet and Information Retrieval and extraction using ConceptNet. 

## What comes in the box

* Dialog Engine
* Multi-User Platform for easy integration with Group Chat systems
* Message Pipeline with POS Tagging, Sentence Analyses and Question Tagging
* Extensible Plugin Architecture

## Install

    npm install --global superscript

## Documentation 

Visit [superscriptjs.com](http://superscriptjs.com) for all the details on how to get started playing with SuperScript.

Also make sure you check out and install the [SuperScript Web Editor](https://github.com/silentrob/superscript-editor)


### Example Script - Script Authoring

    + hello human
    - Hello Bot

`+` matches all input types

`?` matches only question input

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

## Alternate Authoring 

For a simplified web authoring workflow, check out the [Web Editor](https://github.com/silentrob/superscript-editor)

### Additonal Resources

* [Sublime Text Syntax Hilighting](https://github.com/mariusursache/superscript-sublimetext)
* 
### Further Reading

* [Introducing SuperScript](https://medium.com/@rob_ellis/superscript-ce40e9720bef) on Medium
* [Creating a Chatbot](https://medium.com/@rob_ellis/creating-a-chat-bot-42861e6a2acd) on Medium
* [Custom Slack chatbot tutorial](https://medium.com/@rob_ellis/slack-superscript-rise-of-the-bots-bba8506a043c) on Medium
* [SuperScript the big update](https://medium.com/@rob_ellis/superscript-the-big-update-3fa8099ab89a) on Medium
* [Full Documentation](http://superscriptjs.com/documentation/scripting)
* Follow [@rob_ellis](https://twitter.com/rob_ellis)

### Further Watching

* [Talking to Machines EmpireJS](https://www.youtube.com/watch?v=uKqO6HCKSBg)

## Thanks

SuperScript is based off of a fork of RiveScript with idiom brought in from ChatScript. Without the work of Noah Petherbridge and Bruce Wilcox, this project would not be possible. 

## License

[The MIT License (MIT)](LICENSE.md)

Copyright © 2014-2015 Rob Ellis
