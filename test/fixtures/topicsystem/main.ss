
+ testing topic system
- we like it
- i hate it

+ testing topic *
- we really like it

+ force break
- not going to hit this.

+ force continue
- force two

> pre

	+ testing topic system
	- ^save(key, value)

< pre

> topic __pre__
	+ force break
	- ^break()

	+ force continue
	- ^nobreak() force one

< topic
> topic:keep outdoors ( fishing hunting camping ) ^sometest()
	
	+ I like to *
	- i like to spend time outdoors

  + hiking is so much fun
  - I like to hike too!

< topic


> topic fishing ^sometest() ( fish fishing to_fish rod worms )
	
	+ I like to *
	- me too

< topic