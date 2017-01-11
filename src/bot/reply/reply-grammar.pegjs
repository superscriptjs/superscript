start = reply

capture
  = "<cap" starID:integer? ">"
    {
      return {
        type: "capture",
        starID: starID
      };
    }

previousCapture
  = "<p" conversationID:integer "cap" starID:integer? ">"
    {
      return {
        type: "previousCapture",
        starID,
        conversationID
      };
    }

previousInput
  = "<input" inputID:integer? ">"
    {
      return {
        type: "previousInput",
        inputID: inputID
      }
    }

previousReply
  = "<reply" replyID:integer? ">"
    {
      return {
        type: "previousReply",
        replyID: replyID
      }
    }

topicRedirect
  = "^topicRedirect(" args:customFunctionArgs ")"
    {
      return {
        type: "topicRedirect",
        functionArgs: args ? `[${args}]` : null
      }
    }

respond
  = "^respond(" args:customFunctionArgs ")"
    {
      return {
        type: "respond",
        functionArgs: args ? `[${args}]` : null
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

customFunctionLetter
  = !")" letter:. { return letter }

customFunctionArgs
  = letters:customFunctionLetter+ { return letters.join("") }

customFunction
  = "^" !"topicRedirect" !"respond" name:[A-Za-z0-9_]+ "(" args:customFunctionArgs? ")"
    {
      return {
        type: "customFunction",
        functionName: name.join(""),
        functionArgs: args ? `[${args}]` : null
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
  = !"((" "\\" character:[n] { return `\n`; }
  / !"((" "\\" character:[s] { return `\\s`; }
  / !"((" "\\" character:. { return character; }
  / !"((" character:[^^{<~] { return character; }

string
  = string:stringCharacter+ { return string.join(""); }

replyToken
  = capture
  / previousCapture
  / previousInput
  / previousReply
  / topicRedirect
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
