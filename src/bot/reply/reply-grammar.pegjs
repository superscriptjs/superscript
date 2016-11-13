start = reply

functionArg
  = arg:[^),]+ { return arg.join(""); }

topicRedirect
  = "^topicRedirect(" ws* topicName:functionArg ws* "," ws* topicTrigger:functionArg ")"
    {
      return {
        type: "topicRedirect",
        topicName,
        topicTrigger
      }
    }

respond
  = "^respond(" ws* topicName:functionArg ws* ")"
    {
      return {
        type: "respond",
        topicName: topicName
      }
    }

redirect
  = "{@" ws* trigger:[^}]+ ws* "}"
    {
      return {
        type: "redirect",
        trigger: trigger.join("")
      }
    }

customFunctionArg
  = ws* "[" arrayContents:[^\]]* "]" ws*
    { return `[${arrayContents.join("") || ''}]`; }
  / ws* "{" objectContents:[^}]* "}" ws*
    { return `{${objectContents.join("") || ''}}`; }
  / ws* wordnetLookup:wordnetLookup ws*
    { return wordnetLookup; }
  / ws* string:[^,)]+ ws*
    { return string.join(""); }

customFunctionArgs
  = argFirst:customFunctionArg args:("," arg:customFunctionArg { return arg; })*
    { return [argFirst].concat(args); }

customFunction
  = "^" !"topicRedirect" !"respond" name:[A-Za-z0-9_]+ "(" args:customFunctionArgs? ")"
    {
      return {
        type: "customFunction",
        functionName: name.join(""),
        functionArgs: args
      };
    }

newTopic
  = "{" ws* "topic" ws* "=" ws* topicName:[A-Za-z0-9~_]* ws* "}"
    {
      return {
        type: "newTopic",
        topicName: topicName.join("")
      };
    }

clearString
  = "clear"
  / "CLEAR"

clearConversation
  = "{" ws* clearString ws* "}"
    {
      return {
        type: "clearConversation"
      }
    }

continueString
  = "continue"
  / "CONTINUE"

continueSearching
  = "{" ws* continueString ws* "}"
    {
      return {
        type: "continueSearching"
      }
    }

endString
  = "end"
  / "END"

endSearching
  = "{" ws* endString ws* "}"
    {
      return {
        type: "endSearching"
      }
    }

wordnetLookup
  = "~" term:[A-Za-z0-9_]+
    {
      return {
        type: "wordnetLookup",
        term: term.join("")
      }
    }

alternates
  = "((" alternateFirst:[^|]+ alternates:("|" alternate:[^|)]+ { return alternate.join(""); })+ "))"
    {
      return {
        type: "alternates",
        alternates: [alternateFirst.join("")].concat(alternates)
      }
    }

delay
  = "{" ws* "delay" ws* "=" ws* delayLength:integer "}"
    {
      return {
        type: "delay",
        delayLength
      }
    }

keyValuePair
  = ws* key:[A-Za-z0-9_]+ ws* "=" ws* value:[A-Za-z0-9_'"]+ ws*
    {
      return {
        key: key.join(""),
        value: value.join("")
      }
    }

setState
  = "{" keyValuePairFirst:keyValuePair keyValuePairs:("," keyValuePair:keyValuePair { return keyValuePair; })* "}"
  {
    return {
      type: "setState",
      stateToSet: [keyValuePairFirst].concat(keyValuePairs)
    }
  }

stringCharacter
  = !"((" "\\" character:[ns] { return `\\${character}`; }
//  / !"((" "\\" character:[s] { return ` `; }
  / !"((" "\\" character:. { return character; }
  / !"((" character:[^^{<~] { return character; }

string
  = string:stringCharacter+ { return string.join(""); }

replyToken
  = topicRedirect
  / respond
  / redirect
  / customFunction
  / newTopic
  / clearConversation
  / continueSearching
  / endSearching
  / wordnetLookup
  / alternates
  / delay
  / setState
  / string

reply
  = tokens:replyToken*
    { return tokens; }

integer
  = numbers:[0-9]+
    { return Number.parseInt(numbers.join("")); }

ws "whitespace"
  = [ \t]

nl "newline"
  = [\n\r]
