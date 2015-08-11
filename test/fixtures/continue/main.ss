/*
  Continuation dialogue.

*/

> topic random2

+ new conversation
 - What is your name?

   + [my name is] *1
   % What is your name
   - So your first name is <cap1>?

    + ~yes
    % So your first name is *
    - Okay good.

    + ~no
    % So your first name is *
    - Oh, lets try this again... {@conversation}

   + *
   % What is your name
   @conversation

+ break out
- okay we are free

< topic

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

// Testing conversation exaustion GH-133 from slack
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


// GH-133 example from gh issues
/*
+ start
- What is your name?

  + [my name is] *1
  % * what is your name *
  - So your first name is <cap1>?

  + [my name is] *1 *1
  % * what is your name *
  - So your first name is <cap1>?

    + ~yes *
    % * so your first name is *
    - That's a nice name.

    + ~no *
    % * so your first name is *
    - I'm a bit confused.
*/
< topic