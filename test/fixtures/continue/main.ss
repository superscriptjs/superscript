/*
  Continuation dialogue.

*/

> topic:keep random

+ i went to highschool
- did you finish ?
+ *
% did you finish ?
- i went to university


+ i like to travel
- have you been to Madird?
  + ~yes *
  % have you been to Madird?
  - Madird is amazing.

  + ~no *
  % have you been to Madird?
  - Madird is my favorite city.

< topic