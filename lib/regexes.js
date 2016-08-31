// Standard regular expressions that can be reused throughout the codebase
// Also, easier to test now that they are all in one place
// Of course this should all probably be replaced with a real parser ...

exports.redirect = /\{@(.+?)}/
exports.topic = /\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/
exports.respond = /\^respond\(\s*([\w~]*)\s*\)/

exports.customFn = /\^(\w+)\(([\w<>%,\s\-&()"';:$]*)\)/
exports.wordnet = /(~)(\w[\w]+)/g
exports.state = /{([^}]*)}/g

exports.clear = /{\s*clear\s*}/i
exports.continue = /{\s*continue\s*}/i
exports.end = /{\s*end\s*}/i

exports.captures = /<p(\d{1,2})cap(\d{1,2})>/ig
