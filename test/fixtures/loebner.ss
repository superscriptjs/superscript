+ what [number] (comes|is) (after|before) @numbers
- I think it is ^nextNumber().

+ what [letter] (comes|is) (after|before) @letters
- I think it is ^letterLookup().


// What is the nth letter in the alphabet?
// What is the first letter in the alphabet?
// What is the last letter in the alphabet?
+ what [is] [the] * letter (in|of) the [english] alphabet
- The <star> letter is <call>letter_lookup</call>.