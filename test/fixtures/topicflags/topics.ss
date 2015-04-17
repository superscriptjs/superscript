
+ topic change
- Okay we are going to test2 {topic=test2}

> topic test2
  + let us talk about testing
  - topic test pass
< topic

+ set topic to dry
- Okay we are going to dry {topic=dry}

+ set topic to dry again
- Okay we are going to dry {topic=dry}

+ set topic to keeptopic
- Okay we are going to keeptopic {topic=keeptopic}

+ set topic to nostay
- Okay we are going to nostay {topic=nostay}

? why did *
- ^respond(system_why)

+ test recursion
- ^respond(system_recurr)


// Testing sort
+ x *
- Catch all

+ this * catch some
- Catch some

+ this * catch * more
- Catch more


> topic:system system_recurr
  
  + test recursion
  - ^respond(hidden)

< topic

> topic:system system_why
  + * you run
  - to get away from someone
< topic

> topic:system hidden
  + this is a system topic
  - some reply
< topic


/*
  non-Keep Flag Test
  This topic will get depleated and stay empty after all 
  Gambits have been exausted.
*/
> topic dry
  + i have one thing to say
  - dry topic test pass

  + this is a dry topic
  - dry topic test pass
< topic

/*
  Keep Flag Test
  We use the keep flag to allow us to reuse the gambit over and over

*/
> topic:keep keeptopic
  + i have one thing to say
  - topic test pass
< topic


/*
  NoStay Flag Test
  The nostay flag means the topic will change automatically back 
  to the previous one after saying the gambit.
*/
> topic:nostay nostay
  + i am going to stay and go
  - topic test pass
< topic
