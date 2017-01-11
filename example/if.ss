
// This is a interaction fiction example game with basic navigation.
// I will add to more to this to demonstrate items and other state.

> pre

	// Navigate command

	// Option 1 have a global command to set the direction
	// This will change the topic, and say "look" in the new topic

	+ go (north|south|east|west)
	- {keep} You are heading <cap1>. ^topicRedirect(<cap>, "look")

< pre

> topic north

	// Option 2 per topic manually set the topic
	// The problem is this will hit even if your not in the topic so someone could teleport to the backroom
	// from any topic, we can fix that by adding a trigger filter function., now this trigger will only match
	// if you are in the room.

	+ ^inTopic("north") go to the back room
	- {keep} okay, going to the back room {topic=backroom}

	+ look
	- you are in the north room, there is a back room down the hall

< topic


> topic south

	+ look
	- {keep} you are in the south room

< topic


> topic east

	+ look
	- {keep} you are in the east room

< topic

> topic west

	+ look
	- {keep} you are in the west room

< topic


> topic backroom

	+ look
	- {keep} it is dark in here

< topic
