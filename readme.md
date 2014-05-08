# SuperScript

SuperScript is a dialog system + expert system for creating human-like chat bots. It exposes an easy to expand text using wordnet and to extract meaning in text using ConceptNet.


## How it works

The message pipeline contains many steps, and varies from other implemetations.

When input comes into the system we convert the input into a message object. The message object contains multiple purmatuations of the origional object and has been analyzed for parts of speach and question classification.

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
	* Lemmatize input for even better matches
	* Support Optionals and Wordnet lookups in replies
	* Add helper functions for replies eg: Pluralization, Capitalize

	## Information Retrieval
	* ½ Concept Net Support
	* ½ Fact Triples
	* Generic Scripted Concepts
	* Memory
	* Bot variables

	## Dialogue Flow
	* ✓ Topic exhaustion
	* ✓ non-sticky topics (one time replies)
	* Topic Gambits (reverse conversation - Bot Questions)
	* Continuation
	* Weighted replies
	* Better Topic Redirects
	* Active Listening / Passive Listening
	  - Maybe add "suggestedReply" to message stream and catch it after the dialogue exits. Could this be better done with plugins?

 ## Bigger tasks
  * Remove building topic tree from bot flow and cache results to disk
  * Front load Reply.parse regex compile to topic trees
  * Add Example client for IRC, Gabber, Slack or ?

