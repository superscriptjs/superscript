> topic:keep random

  + new capture (interface|face)
  - capture test <cap>

  + new capture [interface|face] 2
  - capture test <cap>

  + new capture *~1 3
  - capture test <cap1>

  + new capture *1 4
  - capture test <cap1>

  + new capture ~like wordnet
  - capture test <cap1>

  + new capture system is *
  - capture test <cap>

  + capture input
  - <input>

  // GH-128
  + *1 is taller than *1
  - <cap1> is taller than <cap2>

  + *~1 is smaller than *~1
  - <cap1> is smaller than <cap2>

  + *(1-1) is bigger than *(1-1)
  - <cap1> is bigger than <cap2>

  + *(1-5) is related to *(1-5)
  - <cap1> is <cap2>

  + previous capture 1 (*)
  - previous capture test one <cap1>

  + previous capture 2
  - previous capture test two <p1cap1>

< topic