/** 
  I want to create a more organic approch to authoring new gambits, topics and replies
  Right now, the system parses flat files to a intermediate JSON object that SS reads and 
  creates an in-memory topic representation. 

  I belive by introducing a Topic DB with a clean API we can have a faster more robust authoring 
  expierence parseing input will become more intergrated into the topics, and Im propising 
  changing the existing parse inerface with a import/export to make sharing SuperScript 
  data (and advanced authoring?) easier.

  We also want to put more focus on the Gambit, and less on topics. A Gambit should be 
  able to live in several topics.

  TODO's
  - export back to ss files
  - figure out sorting withing topics
  - new Web interaface (API) to add facts/gambits/replies
  - intergrate this back into SuperScript flow
  - fix `previous` gambits.
**/

var facts = require("sfacts");
var mongoose = require('mongoose');

module.exports = function(factSystem) {

  Gambit = require("./gambit")(factSystem);
  Topic = require("./topic");
  Importer = require("./import")(factSystem, Topic, Gambit);
  Reply = require("./reply");

  return {
    gambit: Gambit,
    topic: Topic,
    importer: Importer,
    reply: Reply
  }
}

