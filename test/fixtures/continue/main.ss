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
  
% What is your favorite color?
+ *1
- <cap> is mine too.

% What is your favorite color?
+ (blue|green)
- I hate that color.


< topic