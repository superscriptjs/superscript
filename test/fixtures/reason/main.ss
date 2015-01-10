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


// Tom is taller than Mary and Tom is shorter than Joan.
+ [if] <name1> [is|be] [more|less] <adjectives> (then|than) <name2> ~extensions <names> [is|be] <adjectives> (then|than) <name3>
- ^createFact(<cap1>,<cap2>,<cap4>) ^createFact(<cap6>,<cap7>,<cap9>)

// Compare concepts
// Tom is more tall than Mary
+ [if] <name1> [is|be] [more|less] <adjectives> (then|than) <name2>
- ^createFact(<cap1>,<cap2>,<cap4>)

// Who is the tallest
// Who is the older A or B
// Do you know who is the tallest
?:HUM:ind *~3 who *~2 <adjectives> [<name1> or <name2>]
- ^resolveAdjective() 


// Which of them is the oldest
? which *~4 <adjectives> [<name1> or <name2>]
- ^resolveAdjective() 


// I have a friend name __
+ * friend [named] <name1> *
- ^save(friend,<cap1>)

+ * <name1> * likes * play *1
- ^save(<cap1>,<cap2>)

// What is the name of my friend
?:WH ^has(friend) * is the name  *~2 friend *
- Your friends name is ^get(friend).

// What whould I use to put a nail into a wall
? * put a *
- ^putA()

+ * my name is <name>
- {^hasName(false)} ^save(name,<cap1>) Nice to meet you, <cap1>.
- {^hasName(true)} I know, you already told me your name.

?:WH * your name
- My name is Brit.

?:WH * you live
- I live in Vancouver.

?:WH * i live
- ^findLoc()

+ i live *
- Do you like it there?

// What was too small?
?:WH * <adjective>
- ^tooAdjective()

// Concept net
?:WH * i do with a *
- ^usedFor()

?:WH * is a * used for
- ^usedFor()

// What is a thing
? what is a *~2
- ^isA()

// What is NOUN
? what be *1
- ^isA()

?:ENTY:color *
- ^colorLookup()

? what [else] is <adjective1>
- ^colorLookup()

// my car is red
+ my <noun1> is (<adjective1>|<adverb1>)
- ^save(<cap1>,<cap2>)

+ my favorite color is *1
- ^createUserFact(favorite, color, <cap1>)

// what is black
// what is too big
? what be (<adjective1>|<adverb1>)
- ^tooAdjective()

// Resolve Fact 
? is [the] <noun1> <adjective1>
- ^resolveFact()

?:CH * prefer *
- ^makeChoice()

?:NUM:money *
- ^findMoney()

?:NUM:date * birthday
- ^findDate()
