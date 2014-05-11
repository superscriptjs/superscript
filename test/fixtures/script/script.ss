// Simple Test
H This is a test
R Test should pass

// Star match
H connect the *
R Test should pass

// Test single and double star
H Should match single *
R Test two should pass


/*
   Variable length Star
   *2 will match exactly 2 
   *~2 will match 0,2
*/
// Should match it is foo bar hot out
H It is *2 hot out
R Test three should pass

// Should match it foo hot out2
// Should match it hot out2
H It is *~2 hot out2
R Test three should pass


// Test 2 Star match 
H It is *2 cold out
R Two star result <cap>

// varwidth star end case
H define *1
R Test endstar should pass





// Alternates
H What (day|week) is it
R Test four should pass

// Optionals
H i have a [red|green|blue] car
R Test five should pass

// Mix case testing
H THIS IS ALL CAPITALS
R Test six should pass

H Do you have a clue
R Test seven should pass

// Test Multiple line output
H tell me a poem
R Little Miss Muffit sat on her tuffet,\n
^ In a nonchalant sort of way.\n
^ With her forcefield around her,\n
^ The Spider, the bounder,\n
^ Is not in the picture today.


// In this example we want to demonstrate that the trigger 
// is changed to "it is ..." before trying to find a match
H it's all good in the hood
R normalize trigger test

// Custom functions!
H custom *1
R ^wordnetDefine()

H custom2 *1
R ^wordnetDef()

H custom3 *1
R ^bail()

H custom3 *1
R backup plan

