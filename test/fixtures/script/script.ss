// Simple Test
+ This is a test
- Test should pass

// Star match
+ connect the *
- Test should pass

// Test single and double star
+ Should match single *
- Test two should pass


/*
   Variable length Star
   *2 will match exactly 2 
   *~2 will match 0,2
*/
// Should match it is foo bar hot out
+ It is *2 hot out
- Test three should pass

// Should match it foo hot out2
// Should match it hot out2
+ It is *~2 hot out2
- Test three should pass


// Test 2 Star match 
+ It is *2 cold out
- Two star result <cap>

// varwidth star end case
+ define *1
- Test endstar should pass


// Alternates
+ What (day|week) is it
- Test four should pass

// Optionals
+ i have a [red|green|blue] car
- Test five should pass

// Mix case testing
+ THIS IS ALL CAPITALS
- Test six should pass

+ Do you have a clue
- Test seven should pass

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

// Custom functions!
+ custom *1
- ^wordnetDefine()

+ custom2 *1
- ^wordnetDef()

+ custom3 *1
- ^bail()

+ custom3 *1
- backup plan

