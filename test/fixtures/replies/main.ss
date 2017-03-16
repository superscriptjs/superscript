> topic exhaust_topic {exhaust}

  // This is the default reply behaviour 
  + {random} test exhaust random
  - reply one
  - reply two
  - reply three

  + {ordered} test exhaust ordered
  - reply one
  - reply two
  - reply three

< topic

> topic keep_topic {keep}

  + {random} test keep random
  - reply one
  - reply two
  - reply three

  + {ordered} test keep ordered
  - reply one
  - reply two
  - reply three

< topic

> topic reload_topic {reload}

  + {random} test reload random
  - reply one
  - reply two
  - reply three

  + {ordered} test reload ordered
  - reply one
  - reply two
  - reply three

< topic