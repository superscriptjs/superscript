# SuperScript

SuperScript is a dialog system + bot engine for creating human-like conversation chat bots. It exposes an expressive script for crafting dialogue and features text-expansion using wordnet and Information Retreaval and extraction using ConceptNet. 

## What comes in the box
* Dialog Engine
* Multi-User Platform for easy intergration with Group Chat systems
* Message Pipeline with POS Tagging, Sentence Analysys and Question Tagging
* Extensible Plugin Architecture

## How it works

The message pipeline contains many steps, and varies from other implemetations.

When input comes into the system we convert the input into a message object. The message object contains multiple purmatuations of the origional object and has been analyzed for parts of speach and question classification. The message is first handled by the reasoning system, before being sent to the dialog engine for processing.

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
		* POS Input
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
	* ✓ Match input on POS
	* ✓ Adopt chatscript style wildcards 
		- ✓ *   - 0 or more
		- ✓ *n  - exactly n
		- ✓ *~n - zero to n (range selector)
	* ✓ Convery Reply Object to message object
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
  * Group Chat interface 
  	- reply - Message to user in channel "@user ..."
  	- directReply - Privace message to User
  	- replyAll - Message to channel "@everyone ..."
  	- replyNone - Message to channel "..."
  	- fetchUserList 

 ## Plugins
  * Weather - http://www.openweathermap.com/API
  * Google something
  * Twilleo
  * OpenCV
  * iCAL Support

 ## Bugs (Known issues)
  * None
