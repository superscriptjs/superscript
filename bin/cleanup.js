#!/usr/bin/env node

///////////////////////////
// Superscript Refresher //
///////////////////////////

var Promise = require('bluebird'),
    facts = require("sfacts"),
    rmdir = Promise.promisify( require('rimraf') ),
    program = require('commander'),
    superscript = require('../index'),
    fs = require("fs"),
    mongoose = require('mongoose'),
    util = require('util');

var collectionsToRemove = ['users', 'topics', 'replies', 'gambits'];

program
  .version('0.0.2')
  .option('--facts [type]', 'Fact Directory', './systemDB')
  .option('--host [type]', 'Mongo Host', 'localhost')
  .option('--port [type]', 'Mongo Port', '27017')
  .option('--mongo [type]', 'Mongo Database Name', 'systemDB')
  .option('--mongoURI [type]', 'Mongo URI')
  .option('--topic [type]', 'Topic Directory', './topics')
  .option('--skip-remove-all', 'Skip removal of: ' + collectionsToRemove.join(', '))
  .option('--flush-topics', 'Flush imported topics, implies --skip-remove-all')
  .option('--preserve-random', 'When used with --flush-topics, it will not empty the random topic')
  .parse(process.argv);

function removeAll (db) {
    /**
     * @param {Object} MongoDB instance
     * @return {Promise} Resolved after listed collections are removed and the fact system directory has been recursively cleared
     */

    if (program.skipRemoveAll || program.flushTopics) return;

    return Promise.map(collectionsToRemove, function(collName) {
            var coll = db.collection(collName);
            return coll
                .removeAsync({})
                .then(isClear.bind(collName));
        })
        .then(function() {
            // Delete the old fact system directory
            return rmdir(program.facts)
        });
}


function isClear () {
    console.log(this + ' is clear');
    return true;
}


function createFresh () {
    /**
     * @return {Promise} Resolves after all data from the Topics folder has been loaded into Mongodb
     */

    // Generate Shared Fact System
    // If not pre-generated, superscript will throw error on initialization
    var factSystem = facts.create(program.facts),
        parser = require('ss-parser')(factSystem),
        loadDirectory = Promise.promisify( parser.loadDirectory, parser );

    function importAll (data) {
        /**
         * @param {Object} Parsed data from a .ss file
         * @return {Promise} Resolved when import is complete
         */

        console.log('Importing to DB');
        return new Promise(function(resolve, reject) {
          mongoose.connect(mongoURL)

            new superscript({factSystem: factSystem, mongoose: mongoose }, function(err, bot) {
                if (!err) bot.topicSystem.importerData(data, resolve, program.flushTopics, program.preserveRandom);
                else reject(err);
            });
        });
    }

    return loadDirectory(program.topic)
        .then(importAll);
}


// Setup Mongo Client: accepts MONGO_URI from environment, and URI or components or defaults as provided in options.
var MongoClient = Promise.promisifyAll( require('mongodb') ).MongoClient,
    mongoURL = process.env.MONGO_URI || program.mongoURI || util.format('mongodb://%s:%s/%s', program.host, program.port, program.mongo);


// DO ALL THE THINGS
MongoClient.connectAsync(mongoURL)
    .then(removeAll)
    .then(createFresh)
    .catch(function(e) {
        console.log(e);
    })
    .then(function(data) {
        console.log('\nEverything imported');
        return 0;
    }, function(e) {
        console.log('\nImport error', e);
    })
    .then(process.exit);
