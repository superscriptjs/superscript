// Redirect Test
+ redirect landing
- {keep} redirect test pass

+ testing redirects
@ redirect landing

+ this is an inline redirect
- lets redirect to {@redirect landing}


+ this is an complex redirect
- this {@message} is made up of {@two} teams

+ message
- game

+ one
- 1

+ two
- 2


+ this is an nested redirect
- this {@nested message}

+ nested message
- message contains {@another message}

+ another message
- secrets

+ this is a bad idea
- this {@deep message loop}

+ deep message loop
- and back {@this is a bad idea}

// Dummy entry
+ pass the cheese <name>
- Thanks <cap1>


// Redirect to a topic
+ ~emohello *
- ^topicRedirect(weather,__to_say__)

// GH-81 Function with redirect

+ tell me a random fact
- {keep} Okay, here's a fact: ^one() . {@_post_random_fact}

+ _post_random_fact
- Would you like me to tell you another fact?

+ tell me a random fact two
- {keep} Okay, here's a fact. {@_post_random_fact2}

+ _post_random_fact2
-  ^one() Would you like me to tell you another fact?


// Odd..
+ GitHub issue 92
- testing redirects {@    _one_thing   } {@_two_thing   }

+ _one_thing
- one thing

+ _two_thing
- two thing

> topic weather

	+ __to_say__
	- Is it hot

	// Dummy entry
	+ pass the cheese <name>
	- Thanks <cap1>
 
< topic


// Go to a topic Dynamically Spoiler alert it is school
+ i like *1
- ^topicRedirect(<cap1>,__to_say__)

> topic school
	
	+ __to_say__
	- I'm majoring in CS.

< topic

// Redirect to a topic 2

+ topic redirect test
- Say this. ^topicRedirect(testx,__to_say__)

> topic testx

	+ __to_say__
	- Say that.
 
< topic


+ topic redirect to *1
- ^topicRedirect(test2,__to_say__)

> topic test2

	+ __to_say__
	- Capture forward <cap1>
 
< topic


+ topic set systest
- Setting systest. ^changetopic(systest)

> topic:system hidden
  + I am hidden
  - You can't find me.
< topic

> topic:system systest
  + where am I
  - In systest.
< topic

> topic __post__
  + *
  - {keep} Should not match post.
< topic
