+ I love animals
- ^topicRedirect("animals", "__favorite__")

+ I love pets
- ^topicRedirect("pets", "__favorite__")


> topic animals {keep}
  + __favorite__
  - I don't like pets, what is your favorite?

  + Mine is cat
  - Cats are scary, what is your favorite?
  + whatever
  % * what is your favorite *
  -Cats are scary

  + i do love animals
  - Yes, I do as well
< topic

> topic pets {keep}
  + __favorite__
  - Me too, what is your favorite?

  + Mine is cat
  - I love it too, what is your favorite ?
  + whatever
  % * what is your favorite *
  -Cats are fun

  + i do love animals
  - No, I like only cats
< topic