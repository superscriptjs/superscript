start = preprocess

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

wordnetLookup
  = "~" term:[A-Za-z0-9_]+
    {
      return {
        type: "wordnetLookup",
        term: term.join("")
      }
    }

nonReplacementChar
  = "\\" character:[<>)~] { return character; }
  / character:[^<>)~] { return character; }

nonReplacement
  = chars:nonReplacementChar+ { return chars.join(""); }

functionArg
  = capture
  / previousCapture
  / previousInput
  / previousReply
  / wordnetLookup
  / nonReplacement

functionArgs
  = functionArg+

function
  = "^" name:[A-Za-z0-9_]+ "(" args:functionArgs? ")"
    { return [`^${name.join("")}(`, args || '', ')']; }

nonFunctionChar
  = "\\" character:[\^] { return character; }
  / character:[^\^] { return character; }

nonFunction
  = chars:nonFunctionChar+ { return chars.join(""); }

preprocessType
  = function
  / nonFunction

preprocess
  = preprocessType*

integer
  = numbers:[0-9]+
    { return Number.parseInt(numbers.join("")); }

ws "whitespace"
  = [ \t]

nl "newline"
  = [\n\r]
