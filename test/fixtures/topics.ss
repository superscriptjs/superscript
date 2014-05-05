> begin
	H request 
	R {ok}
< begin

+ topic change
- Okay we are going to test2 {topic=test2}

> topic test2
	+ let us talk about testing
	- topic test pass
< topic


+ set topic to dry
- Okay we are going to dry {topic=dry}

> topic dry
	+ i have one thing to say
	- dry topic test pass
< topic
