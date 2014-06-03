var fs        = require('fs');
var str       = require("string");
var facts     = require("./factSystem");
var _         = require("underscore");
var expert    = require("expert");
var async     = require("async");
var debug     = require('debug')("Concept");
var natural   = require("natural");
var ngrams    = natural.NGrams;
// var Lemmer    = require('./node-lemmer').Lemmer;
// var lemmerEng = new Lemmer('english');

var stopwords = ["for", "use", "an", "if", "of", "to", "the", "is", "a", "I", "are", "and", "who", "what", "where", "when","how", "would", "which", "or", "do", "my", "bob"];

// This is a collection of Concept Objects
SuperConcept = function(concepts) {
  this.concepts = concepts;
}

SuperConcept.prototype.pick = function(terms) {
  debug("pick", terms)
  return terms[0];
}

SuperConcept.prototype.toWord = function(term) {
  debug("toWord", term)
  return term.replace(/_/g, " ");
}

// SuperConcept.prototype.makeSingle = function(term) {
//   var words = term.split(" ");
//   var nw = [];
//   for (var i = 0; i < words.length; i++) {
//     var w = lemmerEng.lemmatize(words[i]); 
//     if (w) {
//       nw.push(w[0].text.toLowerCase());
//     } else {
//       nw.push(words[i]);
//     }
//   }
  
//   return nw.join(" ");
// }


SuperConcept.prototype.find = function(term) {
  var found = false;

  for (var i = 0; i < this.concepts.length;i++) {
    if (this.concepts[i].domain.Concept.fetch(term)) {
      found = true;
      break;
    }
  }
  return found;
}

SuperConcept.prototype.query = function() {
  // Pass Args down into the fact system
  var m = [];
  for (var i = 0; i < this.concepts.length; i++) {
    var results = this.concepts[i].fs.query.apply(this.concepts[i].fs, arguments);
    if (_.isArray(results)) {
      m.push(results);
    }
    if (_.isObject(results)) {
      // console.log(results._links)
      debug("RES", this.concepts[i].name)
      m.push(results);
    }
  }
  debug("Flatten", _.flatten(m))
  return _.unique(_.flatten(m));
}

// This is a helper that compares 2 concepts
// Given the verb "speed" we can see which concepts value is greater
// returns -1, 0, 1 or null 
SuperConcept.prototype.compareObject = function(concept1, concept2, verb) {

  var thing1 = this.query("direct_vo", verb, concept1);
  var thing2 = this.query("direct_vo", verb, concept2);

  if (thing1.length == 1 && thing2.length == 1) {
    thing1 = parseFloat(thing1[0]);
    thing2 = parseFloat(thing2[0]);
    return (thing1 < thing2)? 1 : (thing1 > thing2)? -1 : (thing1 == thing2)? 0 : null;
  } else {
    return null;
  }
}

SuperConcept.prototype.lookup = function(msg, cb) {
  
  var words2 = ngrams.bigrams(msg);
  var words1 = ngrams.ngrams(msg, 1);
  words2 = words2.concat(words1);
  var that = this;
  
  words2 = _.map(words2, function(key, item) { return key.join(" ");  });
  words2 = _.reject(words2, function(word) { return _.contains(stopwords, word.toLowerCase()) });

  // console.log("---", words2);

  var itor = function(item, cb) {
    var m = [];    
    for (var i = 0; i < that.concepts.length; i++) {
      var c = that.concepts[i].domain.Concept.fetch(itemToConcept(item))
      if (c) m.push(c.id);
    }

    cb(null, _.unique(m));
  }
  
  async.map(words2, itor, function(err, res){
    debug("About to CB", res);
    cb(_.flatten(res))
  });
}

var itemToConcept = function(item) {
  var item = item.toLowerCase();
  return item.replace(/\s/g, "_");
}

var ConceptObj = function(domain, name) {
  this.name = (name) ? name : "no-name";
  this.highLevelConcepts = [];
  this.referencedConcepts = [];
  this.tables = [];
  this.domain = domain;
  this.fs = new FactSystem(domain);
}

ConceptObj.prototype.find = function(term) {
  var concept = this.domain.Concept.fetch(term);
  return (concept) ? true : false;
}

exports.readFile = readFile = function(file, domain, cb) {
  var Concept   = domain.Concept;
  var isa       = domain.isa;
  var example   = domain.example;
  var cConcept;
  var tableArgs = [];
  var factDef = [];
  var tableProps = [];
  var inTableData = false;
  var tt = [];
  
  var c = new ConceptObj(domain, file);

	var input = fs.createReadStream(file);
  var remaining = '';
	
  input.on('data', function(data) {
    remaining += data;
    var index = remaining.indexOf('\n');
    var concept = str("");
    
    while (index > -1) {
      var line = remaining.substring(0, index);
      remaining = remaining.substring(index + 1);
      
      var nline = str(line).trimLeft();
      var pos = nline.indexOf('concept:');
      
      if (pos == 0) {
      	var tc = str(nline).between('concept:',"(").trim();
        // Some lines have extra leading descriptors
        var words = tc.split(" ");

        if (isConcept(words[0])) {
          c.highLevelConcepts.pushUnique(prepConcept(words[0]))
        }

        cConcept = findOrCreateConcept(str(words[0]));
        debug("Concept", cConcept.id);
        addConcepts(cConcept, nline);

      } else {
        
        if (cConcept) {
          addConcepts(cConcept, nline);  
        } else {

          var pos = nline.indexOf('table:');
          if (pos == 0) {
            // Reset the Fact Tables
            factDef = [];
            inTableData = false;
            var tc = str(nline).between('table:',"(").trim();
            var words = tc.split(" ");
            debug("Table", words[0]);
            c.tables.pushUnique(str(words[0]).chompLeft("~").toLowerCase().trim().s);
            tableArgs = (str(nline).between("(",")").trim()).split(" ").filter(function(e){return e});
            debug("TableArgs", tableArgs);
          } else {
            
            // Deliberatly skip the check (missing the DATA line)
            if (inTableData) {
              // Skip comments
              if (nline.indexOf('#') == -1) {
                addTableData(nline);  
              }
            } else {
              var pos = nline.indexOf('^createfact');
              if (pos == 0) {
                factDef.push((str(nline).between("(",")").trim()).split(" "));
                debug("factDef", factDef);
              }
            }
            
            var td = nline.indexOf('DATA:');   
            if (td == 0) {
              inTableData = true;              
            }
          }
        }
      }
      index = remaining.indexOf('\n');
    }
  });

  input.on('end', function() {
    if (remaining.length > 0) {    
      var nline = str(remaining).trimLeft();
      var pos = nline.indexOf('concept:');
  
      if (pos == 0) {
        var tc = str(nline).between('concept:',"(").trim();
        // Some lines have extra leading descriptors
        var words = tc.split(" ");

        if (isConcept(words[0])) {
          c.highLevelConcepts.pushUnique(prepConcept(words[0]));
        }

        cConcept = findOrCreateConcept(str(words[0]));
        addConcepts(cConcept, nline);
      } else {
        addConcepts(cConcept, nline);
      }
    }
    debug("Added # Facts", factCount);
    factCount = 0;
    cb(c);
  });

  var findOrCreateConcept = function(term, concept) {
      
    if (isConcept(term)) {
      // debug(prepConcept(term));
      c.referencedConcepts.pushUnique(prepConcept(term));
    }

    var nc = term.chompLeft("~").toLowerCase().trim();
    var fetched = domain.Concept.fetch(nc.s);

    if (fetched) {
      return (concept) ? null : fetched;
    } else {
      return (nc.s != "") ? Concept.create({id: nc.s}) : null;
    }
  }

  var addTableData = function(line, args) {

    var buff = [], ia = false, ha = false, qw = false, i = 0, d = {};
    if (line.s != "") {
      var l = line.s;

      for (var n = 0; n < line.length; n++) {
        
        if (/[~a-z0-9-._']/i.test(l[n]) || ia || qw) {
          buff.push(l[n])
          if (l[n] == '"') {
            qw = false;
            buff.pop();
          }
          if (l[n] == ']') {
            ia = false;
            buff.pop();
          }
        } else if (l[n] == '"') {
          qw = true;
        } else if (l[n] == '[') {
          ia = true;
          ha = true;
        } else {
          var nconcept = buff.join("");

          if (nconcept != "") {
            if (ha) {
              d[tableArgs[i]] = parseArray(nconcept)
            } else {
              d[tableArgs[i]] = nconcept;  
            }
            ha = false;
            i++;
            buff = [];
            if (i == tableArgs.length) {
              addFact(d);
            }
          }
        }
      }

      if (buff.length != 0) {
        var nconcept = buff.join("");
        if (ha) {
          d[tableArgs[i]] = parseArray(nconcept)
        } else {
          d[tableArgs[i]] = nconcept;  
        }
        i++;

        if (i == tableArgs.length) {
          addFact(d);
        }        
      }
    }
  }

  var isConcept = function(term) {
    if (_.isString(term)) {
      return (term.indexOf("~") != -1) ? true : false;  
    } else {
      return false;
    }
  }

  var prepConcept = function(term) {
    return str(term).chompLeft("~").toLowerCase().trim().s;
  }

  var factCount = 0;
  var addFact = function(def) {

    if (factDef) {
      for (var i = 0; i < factDef.length; i++ ) {
        if (factDef[i].length == 3) {

          var p0 = (def[factDef[i][0]]) ? def[factDef[i][0]] : factDef[i][0]
          var p1 = (def[factDef[i][1]]) ? def[factDef[i][1]] : factDef[i][1];
          var p2 = (def[factDef[i][2]]) ? def[factDef[i][2]] : factDef[i][2];

          if (_.isArray(p0) || _.isArray(p2)) {
            if (_.isArray(p0)) {
              for (var i = 0; i < p0.length; i++) {
                if (isConcept(p0[i])) c.referencedConcepts.pushUnique(prepConcept(p0[i]));
                if (isConcept(p1)) c.referencedConcepts.pushUnique(prepConcept(p1));
                if (isConcept(p2)) c.referencedConcepts.pushUnique(prepConcept(p2));
                c.fs.createfact(p0[i], p1, p2);
                debug("Creating Fact", p0[i] +' ' + p1 +' '+ p2)
                factCount++;
              }
            }
            if (_.isArray(p2)) {
              for (var i = 0; i < p2.length; i++) {
                if (isConcept(p0)) c.referencedConcepts.pushUnique(prepConcept(p0));
                if (isConcept(p1)) c.referencedConcepts.pushUnique(prepConcept(p1));
                if (isConcept(p2[i])) c.referencedConcepts.pushUnique(prepConcept(p2[i]));
                debug("Creating Fact", p0 +' ' + p1 +' '+ p2[i])
                c.fs.createfact(p0, p1, p2[i]);
                factCount++;
              }
            }
          } else {
            if (isConcept(p0)) c.referencedConcepts.pushUnique(prepConcept(p0));
            if (isConcept(p1)) c.referencedConcepts.pushUnique(prepConcept(p1));        
            if (isConcept(p2)) c.referencedConcepts.pushUnique(prepConcept(p2));
            debug("Creating Fact", p0 +' ' + p1 +' '+ p2)
            c.fs.createfact(p0, p1, p2);
            factCount++;
          }
        }
      }
    }
  }

  var parseArray = function(line) {
    var buff = [], qw = false, ar = [];
    for (var n = 0; n < line.length; n++) {

      if (/[~a-z0-9-_']/i.test(line[n]) || qw ) {
        buff.push(line[n]);
        if (line[n] == '"') {
          buff.pop();
          qw = false;
        }
      } else if (line[n] == '"') {
        qw = true;
      } else {        
        if (buff.join("") != "") {
          ar.push(buff.join(""));
        }
        buff = [];
      }
    }
    // Flush the remaining items from the buffer
    if (buff.length != 0) {
      ar.push(buff.join(""));
    }
  
    return ar;
  }

  // Adds the Concept line, minus the main concept
  var addConcepts = function(cConcept, line) {
    var buff = [], qw = false;
    var l2 = str(line).between("(");
    var p = str(l2.s).indexOf("#");

    var eol = l2.length;
    if(p != -1) {
      eol = p-1;
    }

    for (var n = 0; n < eol; n++) {
      if (/[~a-z0-9-_']/i.test(l2.s[n]) || qw) {
        buff.push(l2.s[n]);
        if (l2.s[n] == '"') {
          buff.pop();
          qw = false;
        }
      } else if (l2.s[n] == '"') {
        qw = true;
      } else {

        var nconcept = buff.join("");
        if (nconcept != "") {
          var subConcept = findOrCreateConcept(str(nconcept), cConcept.id);
          if (subConcept) {
            domain.Fact.establish( cConcept, example, subConcept );
          }          
        }
        buff = [];
      }
    }
  }
};

Array.prototype.pushUnique = function (item){
  if(this.indexOf(item) == -1) {
    this.push(item);
    return true;
  }
  return false;
}

// This is the same as read file, but it reads an array of files
exports.readFiles = function(files, callback) {

  var itor = function(file, next) {
    readFile(file, expert.Domain(), function(con){
      next(null, con);
    });
  }

  async.mapSeries(files, itor, function(err, conceptMap){
    callback(new SuperConcept(conceptMap));
  });
}

