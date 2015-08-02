/*
  Continuation dialogue.

*/

> topic:keep random

+ i went to highschool
- did you finish ?

	+ *
	% did you finish ?
	- i went to university
	- what was it like?


+ i like to travel
- have you been to Madird?
  + ~yes *
  % have you been to Madird?
  - Madird is amazing.

  + ~no *
  % have you been to Madird?
  - Madird is my favorite city.


+ something random
- What is your favorite color?

  + *1 
  % What is your favorite color?
  - <cap> is mine too.

  + (blue|green)
  % What is your favorite color?
  - I hate that color.
    

+ test complex
- reply test {@__complex__}

  + cool
  % * super compound *
  - it works

+ __complex__
- super compound

// Testing conversation exaustion GH-133
+ conversation
- Are you happy?
  + ~yes
  % are you happy
  - OK, so you are happy

  + ~no
  % are you happy
  - OK, so you are not happy

  + *
  % are you happy
  - OK, so you don't know

+ something else
- Random reply

< topic