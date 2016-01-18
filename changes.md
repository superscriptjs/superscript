## 0.10.23
* Bumps ss-parser and includes fixes to the matching, primary around min-max wildcards (gh-231, gh-224)
## 0.10.22
* Fix for GH-227 Have a custom function and system function on the same line killed the execution cycle becuase the system function was not found in the list of plugins
### 0.10.21
* Added scope per message in the reply Object.
### 0.10.20
* Add new plugin `getGreetingTimeOfDay`
### 0.10.19
* Fixes GH-223 with chunking disabled, commas might appear as extra args in custom functions
* Fix for GH-221 Bumps ss-parser (where fix lives) modifies regex for category tilde.