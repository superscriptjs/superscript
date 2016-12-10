> topic random

  + + this is unscaped
  - This should pass

  + * bone *
  - {keep} win 1

  // Simple Test
  + This is a test
  - Test should pass one

  // Star match
  + connect the *
  - Test should pass

  // Test single and double star
  + Should match single *
  - {keep} pass 1
  - {keep} pass 2
  - {keep} pass 3

  /*
    Variable length Star
    *2 will match exactly 2
    *~2 will match 0,2
  */
  // Should match it is foo bar hot out
  + It is *2 hot out
  - Test three should pass

  // Should match it foo hot out 2
  // Should match it hot out 2
  + It is *~2 hot out 2
  - {keep} pass 1
  - {keep} pass 2
  - {keep} pass 3

  + var length *~2
  - {keep} pass 1

  // Min Max Test
  + min max *(1-2)
  - {keep} min max test

  // Min Max Test
  + test 2 min max *(0-1)
  - {keep} min max test

  // Min Max emo GH-221
  + *(1-2) test test
  - {keep} emo reply

  // GH-211
  + test *(1-99)
  - {keep} test <cap1>

  // Test 2 Star match
  + It is *2 cold out
  - Two star result <cap>

  // varwidth star end case
  + define *~1
  - Test endstar should pass

  // fixedwidth star end case
  + fixedwidth define *1
  - Test endstar should pass

  + * (or) *
  - alter boundry test

  + * (a|b|c) * (d|e|f)
  - alter boundry test 2

  // Alternates
  + What (day|week) is it
  - {keep} Test four should pass

  // Optionals
  + i have a [red|green|blue] car
  - {keep} Test five should pass

  // Mix case testing
  + THIS IS ALL CAPITALS
  - Test six must pass

  + this reply is random
  - yes this reply is ((awesome|random))

  + reply with wordnet
  - i ~like people

  // In this example we want to demonstrate that the trigger
  // is changed to "it is ..." before trying to find a match
  + it's all good in the hood
  - normalize trigger test

  // Replies accross triggers should be allowd, even if the reply is identical
  + trigger 1
  - generic reply
  + trigger 2
  - generic reply

  // Reply Flags
  + reply flags
  - say one thing
  - {keep} say something else

  + reply flags 2
  - {keep} keep this

  + error with function (*)
  - ^num(<cap1>)

  // Custom functions!
  + custom *1
  - ^wordnetDefine()

  + custom 2 *1
  - ^wordnetDef()

  + custom 3 *1
  - ^bail()

  + custom 3 function
  - backup plan

  + custom 4 *1
  - ^one() + ^one() = 2

  + custom 5 *1
  - he ^plural("like") this

  + custom 6 *1
  - he ^plural(~like) this

  + custom 7 *1
  - he ^plural(<cap1>) this

  + custom 8 *1
  - ^num("4") + ^num("3") = 7

  + custom 9 *1
  - a\n
  ^ b\n
  ^ ^one()\n\n
  ^ more

  // We pull in wordnet and system facts
  + I ~like shoe
  - Wordnet test one

  + I love ~SPORTS_BALL *
  - {keep} Term expanded

  + my ~family_members be fat
  - {keep} Ouch

  + what is one plus one
  - It is two.

  + how many (letters|chars|characters) [are there] in [the word] *~3
  - {keep} ^wordLength(<cap2>)

  + what [letter] (comes|is) (after|before) *~1
  - {keep} ^letterLookup()

  // What is the nth letter in the alphabet?
  // What is the first letter in the alphabet?
  // What is the last letter in the alphabet?
  + what [is] [the] * letter (in|of) the [english] alphabet
  - {keep} ^letterLookup()

  + call function with new topic
  - ^changetopic("fish")

  + reply with a new topic from function
  - ^changefunctionreply("fish")

  // This will save the name to the internal fact system for this user.
  + save name *1
  - {keep} ^save("name", <cap1>) Hi <cap1>.

  + ^not("filter|filterx") trigger *1 function
  - trigger filter reply

+ can you smile
- ^addMessageProp("emoji","smile") Sure can.

+ object param 1
- ^objparam1()

+ object param 2
- ^objparam2() ^addMessageProp("foo", "bar")

// Object params though topicRedirect
+ object param 3
-  ^addMessageProp("foo", "bar") ^topicRedirect("test_topic", "__objParams__")

// Reply Filter functions
+ my name is <name>
- {^hasName("false")} ^save("name",<cap1>) Nice to meet you, <cap1>.
- {^hasName("true")} I know, you already told me your name.

? * your name
- My name is Brit.

+ i go by *~4
- {keep} so you go by <cap1>

< topic

// Object params though topicRedirect (related topic)
> topic:keep test_topic
  + __objParams__
  - ^objparam1()
< topic

> topic fish

  + I like fish
  - me too
< topic


+ generic message
- {keep} generic reply ^showScope()

+ generic message 2
- {keep} generic reply ^showScope()


// Style Tests

// Mix case testing
+ THIS IS ALL CAPITALS
- {keep} Test six must pass

+ Do you have a clue
- Test seven must pass

+ Do you have a cause
- Test seven must pass

+ Do you have a condition
- Test seven must pass

+ John is older than Mary and Mary is older than Sarah
- Test eight must pass

// should match without commas
+ is it morning noon night
- Test nine must pass

// Remove Quotes
+ remove quotes around car
- Test ten must pass

+ reply quotes
- Test "eleven" must pass

// Test Multiple line output
+ tell me a poem
- Little Miss Muffit sat on her tuffet,\n
^ In a nonchalant sort of way.\n
^ With her forcefield around her,\n
^ The Spider, the bounder,\n
^ Is not in the picture today.


// In this example we want to demonstrate that the trigger
// is changed to "it is ..." before trying to find a match
+ it's all good in the hood
- normalize trigger test

+ it's all good in the hood 2
- normalize trigger test

+ I ~like basketball
- Wordnet test one


+ spaced out
- note the space\s\s

// Sub Replies
+ redirect_rainbow
- ^topicRedirect("rainbow","__delay__")

> topic rainbow
  + __delay__
  - red\n
  ^ {delay=500} orange\n
  ^ {delay=500} yellow\n
  ^ {delay=500} green\n
  ^ {delay=500} blue\n
  ^ {delay=500} and black?

  + how many colors in the rainbow
  - {delay=500} lots
< topic


// Special topics flow with inline redirection
> topic __pre__
  + flow redirection test
  - Going back. {@flow match}
< topic

> topic flow_test
  + flow match
  - {keep} You are in the first reply.
  + next flow match
  - You are in the second reply. {@flow match}
< topic

// gh-173
+ name
- {keep} ^respond("set_name")

> topic:keep:system set_name
  + *
  - What is your first name?

  + *~5
  % * is your first name?
  - ^save("firstName", <cap>) Ok <cap>, what is your last name?

  + *~5
  % * what is your last name?
  - ^save("lastName", <cap>) Thanks, ^get("firstName") ^get("lastName")! {topic=random} {clear  }
< topic


> topic:keep:system generic

  + __simple__
  - ^breakFunc()

  + *
  - no match
< topic


// GH-243
+ filter by *1
- {^word(<cap1>,"logic")} logic
- {^word(<cap1>,"though")} though
- {^word(<cap1>,"ai")} ai


+ scope though redirect
- ^topicRedirect("__A__", "__B__")

> topic:keep:system __A__
  + __B__
  - ^showScope()
< topic

+ __preview
- {@__preview_question_kickoff} ^addMessageProp("topLevelProp","myProp")

+ __preview_question_kickoff
- Do you want to play word games? Yes? ^addMessageProp("subProp","mySubProp1")
- Let's play word games OK? ^addMessageProp("subProp","mySubProp2")

+ let's test objects/arrays as custom function args
- here's my answer ^testCustomArgs({myKey: "value"}, ['hey!'])

+ what if there's more tags in custom func
- and the result is ^testMoreTags("super", "awesome")

> topic:keep super
  + awesome
  - yay
< topic

+ ^hasTag("hello") *
- Greetings!

+ set a fact
- that is a cool fact ^createUserFact("thisfact", "cooler", "thatfact")
