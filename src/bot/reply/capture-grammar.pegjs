start = captures

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

stringCharacter
  = "\\" character:[<>] { return character; }
  / character:[^<>] { return character; }

string
  = string:stringCharacter+ { return string.join(""); }

captureType
  = capture
  / previousCapture
  / previousInput
  / previousReply
  / string

captures
  = captureType*

integer
  = numbers:[0-9]+
    { return Number.parseInt(numbers.join("")); }

ws "whitespace"
  = [ \t]

nl "newline"
  = [\n\r]
