### 1.1.2

* Fixes an issue with doing conversations with multiline replies.

### 1.1.1

* Fixes a warning using the `moment` dependency.
* Additional error message for errors within custom functions.

### 1.1.0

* You can now configure the number of messages in the history that are checked when seeing if replies should be exhausted or not by using the `historyCheckpoints` option (thanks @Samurais!).

### 1.0.6

* Mongoose now uses the global Promise object to avoid a DeprecationWarning (thanks @Lewwwk!).
* Cleanup and parse bin scripts now accept a MONGODB_URI environment variable for easy cleanup/parsing on Heroku.
* Parse bin script also now accepts custom MongoDB connection params.

### 1.0.5

* The history field on the User model now retains 500 messages (up from 15) for logging purposes. It also is now an array of objects, rather than being an object of arrays, so we can more easily iterate over the history, and allows us to slice the array easily.
* Removed mongoose-findorcreate and replaced with native mongoose options `upsert` and `new`.

### 1.0.4

* Fixes issue when using {clear} with inline redirects.

### 1.0.3

* Fixes issue with significantly large triggers (over 1024 bytes) not being serialised into Mongo.
* Fact system import internals have been re-written.

### 1.0.2

* Performance improvement by another 20% or so by using Mongoose's lean queries, and skipping an extraneous query.
* All the internal reply logic now uses async/await instead of callbacks.

### 1.0.1

* Fixes GH-317 by expanding custom concepts at parse time.
* Removes unused field in User model.

### 1.0.0

We're very excited to push v1 into the wild, which marks the first major release of SuperScript! In this version, we've focused mainly on cleaning up the codebase, ensuring extensibility, and squeezing performance out of the runtime to ensure that your bots are nice and snappy.

An overview of the big changes include:

* Parsing is now lightning fast. We're looking at over 100x faster. 🔥
* Replying is faster too, by over 10x. These two improvements are mainly thanks to some new logic in the normalisation step, which is now supported by the [bot-lang](https://github.com/bot-ai/bot-lang) repo.
* More reliable trigger matching and reply exhaustion.
* An easy-to-use API to set up SuperScript. No more dealing with setting up fact systems or topic systems yourselves: just set the relevant options and we take care of it for you.
* A brand new [PEG.js](https://github.com/pegjs/pegjs) parser to parse bot scripts, allowing us to easily extend and modify syntax in the future, and be able to reliably inform you if you've written an invalid script.
* Moved the fact system to Mongo to be completely independent of the file system and stateless. You can now run on Heroku, AWS, or other cloud services without fear of writing to a transient file system or syncing data between servers.
* Re-written the code to take advantage of the latest ES6+ features.
* Windows support! 🖥️
* Closed over 50 GitHub issues, from topic redirection issues to capturing data.

We've added some cool new features like:

* We've added some new ways to define how replies should be chosen: `{ordered}`, `{random}`, `{keep}`, `{exhaust}` and `{reload}`.
* Arguments to plugin functions are now JavaScript literals, so you can pass objects, arrays, numbers and so on to your functions.
* We now support message plugin functions to run a plugin on every message, so you can attach extra properties to your messages like 'names' to use in later plugins.
* You can now run multiple bots from different database URIs on a single server, and also run multiple bots from a single database URI using built-in multi-tenancy.
* You can now customise the conversation timeout from the default of 5 minutes.

We've also deprecated some of the old syntax. For the full list, see the [Upgrading to v1 Guide](https://github.com/superscriptjs/superscript/wiki/Upgrading-to-v1). Some of the more important points are:

* The API to use SuperScript has changed dramatically. Now, you call `superscript.setup` and pass an `options` object.
* The old tags like `~emohello` and `~emogreetings` are deprecated. Now, you'd use the plugin `^hasTag('hello')` to check if a user has said something like `hello`.
* Questions no longer have types or sub-types. We're looking to improve this in the future.

We really hope you like v1, and we're always open to new ideas, improvements, issues and pull requests. We already have some exciting things lined up for v2, and we hope this brings SuperScript closer to being the de-facto choice of human-like bot for developers! Join us on [Slack](http://superscript-slackin.herokuapp.com/) to talk about what we have planned and anything else bot-related.

A big thank you to everyone who has contributed towards our first release. We couldn't have got there without you.

The SuperScript Team

### 0.11.26
* Fix for GH-262. If a concept is captured we convert it to a non-concept. ^save() will now test for 3 arguments.
* Fix for GH-259. Harden missing filter and plugin routes, warn louder and pass errors down if hit in topicRedirect.

### 0.11.25
* This continues to build out the debugging and logging, now redirects and respond functions are more clear.

### 0.11.24
* Added a new Google Hangout Client
* Bubbled up the internal log to the client as `debug` on the reply object.

### 0.11.23
* Wrapped User Model Create to support schema or pre-existing.

### 0.11.22
* fix/enhancement - If you have OOB data it will now persist though topicRedirect(...), OOB data will also be merged together if you have added some before and after the redirect too.

### 0.11.21
* In custom function (plugins) you can now pass back an object instead of a string providing it contains a `text` or `reply` property. All other params well become OOB data.

### 0.11.20
* Pass clearConvo {CLEAR} back though topicRedirect

### 0.11.19
* Pass matchBit forward though redirect/respond/custom function
* Pass extraScope forward though topicRedirect function
* Pass extraScope forward though respond function
* Pass extraScope forward though inline redirect

### 0.11.18
* Adds Telegraph Client
* Feature GH-243 - Filter Input now supports captured input.

### 0.11.17
* Re-added nostay topic flag

### 0.11.16
* Fixed a regression in ^respond
* Moved some console.log to debug.error

### 0.11.15
* Adds new directReply endpoint and more cheanup on msg

### 0.11.14
* Adds `bot` to scope, this will allow plugins to create users.

### 0.11.13
* Introducded a typo bug in 0.11.12 - fixed here

### 0.11.12
* Add new logging interface for better debugging.

### 0.11.11
* Change the custom function regex (again) This time allow `:`.

### 0.11.10
* Change the custom function regex (again) This time allow `$`.

### 0.11.9
* Remove leading spaces from reply.

### 0.11.8
* Nuke MessageScope before saving the object back to the history

### 0.11.7
* Allows `;` into custom function

### 0.11.6
* Freezes moongoose, hit rangeError bug reported.

### 0.11.5
* GH-240 - Added {END} and {CONTINUE} reply flags, but failed to pass them forward though topicRedirects this has now been fixed.

### 0.11.4
* GH-239 - Scope screep issues
* New logging output - The logs are not JSON per line with a match array showing all matches. This was a signigant change under the hood requiring lots of cleanup.

### 0.11.3
* Allow even more characters into custom function (`(`,`)`, and `&`)

### 0.11.2
* Allow more extended characters into custom function (`-`,`'`, and `"`)

### 0.11.1
* Just a tiny change to unlock the normalizer version.

### 0.11.0
* Adds a new command `%%` for dynamic conversations (gh-206).

This works by setting some state in a reply for example:
```
+ some input
- some reply {key=value}
```

Then later in the conversation you can create a condition by one of three methods:
```
// trigger is assumed to be a wildcard
%% (key === value)
- now say this

// setting a trigger
%% (key === value)
+ then match this
- now say this

// Set a collection of gambits
%% (key === value) {
  + then match this
  - now say this

  + or that
  - now really say this
}
```
The conversation state is whiped clean when you the topic changes.


### 0.10.25
* Adds a new {CLEAR} flag you can append to replies to kill the conversation loop. This will reset the conversation back to the topic level on the next input cycle.

### 0.10.24
* Fix for gh-236. In some cases custom plugins were firing multiple times.

### 0.10.23
* Bumps ss-parser and includes fixes to the matching, primary around min-max wildcards (gh-231, gh-224)

### 0.10.22
* Fix for GH-227 Have a custom function and system function on the same line killed the execution cycle becuase the system function was not found in the list of plugins

### 0.10.21
* Added scope per message in the reply Object.

### 0.10.20
* Add new plugin `getGreetingTimeOfDay`

### 0.10.19
* Fixes GH-223 with chunking disabled, commas might appear as extra args in custom functions
* Fix for GH-221 Bumps ss-parser (where fix lives) modifies regex for category tilde.
