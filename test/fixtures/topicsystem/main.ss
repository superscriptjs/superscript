
+ testing topic system
- we like it
- i hate it

+ testing topic *
- we really like it

+ force break
- not going to hit this.

+ force continue
- force two

+ testing flow
- bingo

+ break with continue
- {CONTINUE} ended

// With the continue bit set we should still hit this next one too
+ break * continue
- test passed

> topic:keep __pre__

	+ testing topic system
	- ^save(key, value)

	+ force break
	- ^break()

	+ force continue
	- ^nobreak() force one

	+ testing flow
	- ^save(key, value)

< topic
> topic:keep outdoors ( fishing hunting camping ) ^sometest()
	
	+ I like to *
	- i like to spend time outdoors

  + hiking is so much fun
  - I like to hike too!

  + I like to spend *
  - outdoors

< topic


> topic fishing ^sometest() ( fish fishing to_fish rod worms )

  + I like to spend time *
  - fishing
  
	+ I like to *
	- me too

< topic


// GH-240
+ test empty
- ^topicRedirect(test, __empty__)

+ test respond
- ^respond(test)

> topic:keep test
    + __empty__
    - {END}

    + test respond
    - {END}
    
    + __something__
    - Something

    + *
    - Topic catchall
< topic

