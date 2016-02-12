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