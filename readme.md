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

When input comes into the system we convert the input into a message object. The message object contains multiple purmatuations of the origional object and has been analyzed for parts of speach and question classification. The message is first handled by the reasoning system, before being sent to the dialog engine for processing.

## Install

    

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
  * Custom Functions and Plugins
    * Date Time Functions
    * Wordnet Functions
  * Reasoning with ConceptNet
* Working with Topics
  * What is a topic
  * The '__begin__' topic
  * The 'random' topic
  * Topic Flags
    * keep
    * nostay
* The Message Object
* The User Object

# Roadmap
  ## General Scripting
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

  ## Information Retrieval
  * ✓ Concept Net Support
  * ✓ Fact Triples
  * ✓ Generic Scripted Concepts
  * ✓ Memory
  * ✓ Bot variables

  ## Dialogue Flow
  * ✓ Topic exhaustion
  * ✓ non-sticky topics (one time replies)
  * ✓ Continuation
  * ✓ Better Topic Redirects
  * Topic Gambits (reverse conversation - Bot Questions)
  * Active Listening / Passive Listening
  * Volley and re-serve.
    - ✓ Volley support, keep track of who dropped the ball
    - ✓ Rally support, keep track of how well the thread is going.

 ## Bigger tasks
  * ✓ Add popular names to aid when NNP is NN http://www.behindthename.com/top/lists/ud/1980
  * ✓ Remove building topic tree from bot flow and cache results to disk
  * ✓ Front load Reply.parse regex compile to topic trees
  * Change Expert.js to LevelDB GraphDB ? 
  * Group Chat interface (This should be another project / layer up)
    - reply - Message to user in channel "@user ..."
    - directReply - Privace message to User
    - replyAll - Message to channel "@everyone ..."
    - replyNone - Message to channel "..."
    - fetchUserList 

 ## Plugin Ideas
  * ✓ Weather (Brit)
    - http://www.openweathermap.com/API
    - http://api.openweathermap.org/data/2.5/find?q=Vancouver&type=like&mode=json
  * Google something 
  * twilio.com
  * OpenCV
  * iCAL Support

 ## Bugs (Known issues)
  * Still Alpha, everything is unstable.
  * Report them. Provide a failing test please.
