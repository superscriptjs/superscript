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
    
// Keep test GH-100
+ aaa
- 111
  + bbb
  % 111
  - {keep} 222
    + ccc
    % 222
    - {keep} 333

+ test complex
- reply test {@__complex__}

  + cool
  % * super compound *
  - it works

+ __complex__
- super compound

< topic