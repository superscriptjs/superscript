?:NUM:expression *
- ^evaluateExpression()

?:DESC:def * roman (numerial|numeral) *
- ^numToRoman()

?:DESC:def * (hex|hexdecimal) *
- ^numToHex()

?:DESC:def * binary *
- ^numToBinary()

?:NUM:other * (missing) *
- ^numMissing()

?:NUM:other * (sequence) *
- ^numSequence()

// Tom is more tall than Mary
// + <names> [is] (less|more) ~adjectives ~than <names1>
// - we have a winner