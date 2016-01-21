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