# SuperScript

SuperScript is a dialog system + bot engine for creating human-like conversation chat bots. It exposes an expressive script for crafting dialogue and features text-expansion using wordnet and Information Retreaval and extraction using ConceptNet. 

SuperScript is based off of a fork of RiveScript with idiom brought in from ChatScript. Without the work of Noah Petherbridge and Bruce Wilcox, this project would not be possible. 

## What comes in the box
* Dialog Engine
* Multi-User Platform for easy intergration with Group Chat systems
* Message Pipeline with POS Tagging, Sentence Analysys and Question Tagging
* Extensible Plugin Architecture

## How it works

The message pipeline contains many steps, and varies from other implemetations.

When input comes into the system we convert the input into a message object. The message object contains multiple purmatuations of the origional object and has been analyzed for parts of speach and question classification. The message is then sent to the dialog engine for output matching and processing.

## Install

    npm install superscript

## Examples

    + I like fish
    - Thats nice, I'm a vegetarian.

When input comes into the system that matches "I like fish", it will return with the command "Thats nice, I'm a vegetarian.". 


## Features
* dialog engine
* custom functions 
* expressive syntax
* real knug-fu action grip

## Documentation
* What is this thing
* Triggers
  * Basic rules
  * Wildcards
    * Variable Length Wildcards
    * Exact Length Wildcards
    * Open Eneded Catch alls
  * Alternate words in triggers
  * Optional Words in triggers
  * Captureing Data Back
  * Special Matches
    * Question Types
    * Answer Types
  * Wordnet Expansion
* Replies
  * Reply flag {keep} 
  * Reply redirect {@redirect=} 
  * Custom Functions and Plugins
    * Date Time Functions
    * Wordnet Functions
  * Reasoning with ConceptNet
* From Personal Assistant to best friend
  * "*" command and how it works
  * "*:1" special modifiers for first thing said
* Working with Topics
  * What is a topic
  * The '__begin__' topic
  * The 'random' topic
  * Topic Flags
    * keep
    * nostay
  * Topic before and after hooks
    * The 'pre' topic
    * The 'post' topic
* The Message Object
* The User Object

## Roadmap

  * ✓ Normalize rules for better matches
  * ✓ Custom Functions
  * ✓ Match input on QuestionType
  * ✓ Match input on AnswerType
  * ✓ Adopt chatscript style wildcards 
    - ✓ *   - 0 or more
    - ✓ *n  - exactly n
    - ✓ *~n - zero to n (range selector)
  * ✓ Convert Reply Object to message object
  * ✓ Break Sentences into multiple message objects
  * ✓ Support Optionals and Wordnet lookups in replies
  * ✓ Add helper functions for replies eg: Pluralization, Capitalize
  * ✓ Logging Threads / Transcripts
  * ✓ Need a way for the bot to reply with something
  * ✓ Reply level "topic" style flags {Keep}


  ### Information Retrieval

  * ✓ Concept Net Support
  * ✓ Fact Triples
  * ✓ Generic Scripted Concepts
  * ✓ Memory that presists users data (LevelDB via sfacts)

  ### Dialogue Flow

  * ✓ Topic exhaustion
  * ✓ non-sticky topics (one time replies)
  * ✓ Continuation
  * ✓ Better Topic Redirects
  * ✓ Topic Gambits (reverse conversation - Bot Questions)
  * ✓ Volley and re-serve.
    - ✓ Volley support, keep track of who dropped the ball
    - ✓ Rally support, keep track of how well the thread is going.
  * Remove Begin topic
  * Assign a starting topic


 ## Bigger tasks
  * ✓ Add popular names to aid when NNP is NN 
      - http://www.behindthename.com/top/lists/ud/1980
  * ✓ Remove building topic tree from bot flow and cache results to disk
  * ✓ Front load Reply.parse regex compile to topic trees
  * ✓ Change Expert.js to LevelDB GraphDB ? 
  * ✓ Move Reasoning to Brit / Plugins
  * Group Chat interface (This should be another project / layer up)
    - reply - Message to user in channel "@user ..."
    - directReply - Privace message to User
    - replyAll - Message to channel "@everyone ..."
    - replyNone - Message to channel "..."
    - fetchUserList 


## Bugs (Known issues)
  * Still Alpha, everything is unstable.
  * Report them. Provide a failing test please.
