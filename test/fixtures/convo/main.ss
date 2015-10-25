> topic basic

  + Can you skip rope?
  - yep

  + Can you jump rope?
    - yep, can you?
    + Have you done it lately?
    % ~yes, can you?
    - We should hang out sometime.

< topic

> topic __pre__

  + redirect *1 (*)
  - ^topicRedirect(<cap1>,<cap2>)

< topic

> topic:system:keep testconversation

  + trigger one
  - trigger one test ok

  + trigger two
  % trigger one test ok
  - trigger two test ok. lastreply is trigger one test ok.

  + wildcard in lastreply
  % * lastreply is trigger one *
  - wildcard in lastreply test ok

  + trigger two
  - trigger two test ok. lastreply does not exist.

  + *
  - matched by catch all wildcard.

< topic
