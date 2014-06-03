var _ 			= require("underscore");
var str 		= require("string");
var expert 	= require("expert");
var debug 	= require("debug")("FactSystem");

FactSystem = function(domain) {
	
	this.domain = domain || expert.Domain();
	return this;
}

FactSystem.prototype._findOrCreateConcept = function(concept) {
	if (typeof concept == "string") {
		var term = str(concept).chompLeft("~").toLowerCase().trim();
		var newConcept = this.domain.Concept.fetch(term.s);
		return (newConcept) ? newConcept : this.domain.Concept.create({id: term.s });
	} else {
		return concept;
	}
}

FactSystem.prototype.createRelation = function(verb, oppisite, isTransitive) {
	var rel = this.domain.Relation.create({id: verb, isTransitive: isTransitive});
	this.domain.Relation.create({id: oppisite, inverseFor: rel, isTransitive: isTransitive});
};

FactSystem.prototype._findOrCreateRelation = function(relation, isTransitive) {
	if (typeof relation == "string") {
		var term = str(relation).chompLeft("~").toLowerCase().trim();
		var newRelation = this.domain.Relation.fetch(term.s);
		if (newRelation) {
			return newRelation;	
		} else {

			if (isTransitive) {
				var rel = this.domain.Relation.create({id: term.s, isTransitive: true });
				this.domain.Relation.create({id: term.s + "_op", inverseFor: rel, isTransitive: true});
				return rel;				
			} else {
				var rel = this.domain.Relation.create({id: term.s});
				this.domain.Relation.create({id: term.s + "_op", inverseFor: rel});
				return rel;
			}
		}
	} else {
		return relation;
	}
}

/*
	Create a fact is a wraper for establish fact.
	Both Subject and Object are concepts
	Verb is the relationship between them.
*/
FactSystem.prototype.createfact = function(subject, verb, object, isTransitive) {
	var newSubject = this._findOrCreateConcept(subject);
	var newObject = this._findOrCreateConcept(object);
	var newVerb = this._findOrCreateRelation(verb, isTransitive);

	this.domain.Fact.establish( newSubject, newVerb, newObject );
}

FactSystem.prototype.findfact = function(subject, verb, object) {
	var s = this.domain.Concept.fetch(subject.toLowerCase());	
	var o = this.domain.Concept.fetch(object.toLowerCase());
	var v = this.domain.Relation.fetch(verb.toLowerCase());	

	return (s && o && v) ? s[v](o) : -1;
}

/*
	direct_s - find all facts with the given subject
	direct_v – find all facts with the given verb
	direct_o – find all facts with the given object
	direct_sv – find all facts with the given subject and verb
	direct_vo – find all facts with the given object and verb 
	direct_svo- find all facts given all fields (prove that this fact exists).
*/
FactSystem.prototype.query = function() {
	
	if (arguments.length > 1) {
		switch(arguments[0]) {
			case "direct_svo" : return this._svo(arguments); break;
			case "direct_sv": return this._sv(arguments, null); break;
			case "direct_so": return this._so(arguments, null); break;
			case "direct_vo": return this._vo(arguments); break;
			case "direct_s": return this._s(arguments, null); break;
			case "direct_v": return this._v(arguments); break;
			case "direct_o": return this._s(arguments, null); break;

			case "expand_sv":  return this._sv(arguments, 1); break;
			case "expand_s":  return this._s(arguments, 1); break;
			case "expand_o":  return this._s(arguments, 1); break;
			case "up_sv":  return this._sv(arguments, -1); break;
		}

	} else {
		return new Error("Invalid Arguments or param");
	}
}

FactSystem.prototype.get = function() {
	var res = this.query.apply(this, arguments);
	return (_.map( res, function(c){ return c.id; }));
}

FactSystem.prototype._svo = function(args) {
	if (args.length != 4) {
		return new Error("Invalid Arguments or param");
	} else {
		var matched = false;
		var subject1 = this.domain.Concept.fetch(args[1].toLowerCase());	
		var verb = this.domain.Relation.fetch(args[2].toLowerCase());	

		var q1 = _.map(verb(subject1), function(c){ return c.id; });
		if (q1 != -1 ) {
			q1.forEach(function(x) { if (x == args[3].toLowerCase()) { matched = true; } });
		}
	
		return matched;
		// return (this.findfact(args[1], args[2], args[3]) != -1) ? true : false;
	}
}

// Find what relations are in common between 2 concepts
// We also match on inverse relations
FactSystem.prototype._so = function(args, depth) {
	if (args.length != 3) {
		return new Error("Invalid Arguments or param");
	} else {

		var s = this.domain.Concept.fetch(args[1].toLowerCase());	
		var o = this.domain.Concept.fetch(args[2].toLowerCase());
		if (s && o)	 {
			var sr = Object.keys(s._links);
			var or = Object.keys(o._links);

			// We split off the "_op" to match on oppisite verbs too
			sr = sr.map(function(i){ return i.split("_")[0];});
			or = or.map(function(i){ return i.split("_")[0];});

			return _.intersection(sr, or);			
		} else {
			return null;	
		}
	}
}

FactSystem.prototype._sv = function(args, depth) {
	if (args.length != 3) {
		return new Error("Invalid Arguments or param");
	} else {
		var s = this.domain.Concept.fetch(args[1].toLowerCase());	
		var v = this.domain.Relation.fetch(args[2].toLowerCase());	


		if (s && v) {
			if (depth) {
				if (depth > 0) {
					// We expand Examples, if there are any... this may be a bad idea TBD
					return fetchExamples(v(s));
				} else {
					return fetchISA(v(s));
				}
			} else {
				return (_.map( v(s), function(c){ return c.id; }));
			}
		} else {
			return -1;
		}
	}
}

FactSystem.prototype._vo = function(args) {
	if (args.length != 3) {
		return new Error("Invalid Arguments or param");
	} else {
		var v = this.domain.Relation.fetch(args[1].toLowerCase());	
		var o = this.domain.Concept.fetch(args[2].toLowerCase());	

		if (o && v) {
			var res = o._links[v.inverseFor.id];
			return (_.map( res, function(c){ return c.id; }));
		} else {
			return -1;
		}
	}
}

FactSystem.prototype._s = function(args, depth) {
	if (args.length != 2) {
		return new Error("Invalid Arguments or param");
	} else {
		var s = this.domain.Concept.fetch(args[1].toLowerCase());	
		if (depth) {
			if (depth > 0) {
				// We expand Examples, if there are any... this may be a bad idea TBD
				return fetchExamples([s]);
			} else {
				return fetchISA([s]);
			}
		} else {
			return (s) ? s : -1;	
		}
	}
}

FactSystem.prototype._v = function(args) {
	if (args.length != 2) {
		return new Error("Invalid Arguments or param");
	} else {
		var s = this.domain.Relation.fetch(args[1].toLowerCase());	
		return (s) ? s : -1;
	}
}

// This is a helper that compares 2 concepts
// Given the verb "speed" we can see which concepts value is greater
// returns -1, 0, 1 or null 
FactSystem.prototype.compareObject = function(concept1, concept2, verb) {

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

var fetchExamples = function(concepts) {
	var items = [];
	for (var concept in concepts) {
		if(concepts[concept]._links && concepts[concept]._links['example']) {
			for(var i = 0; i < concepts[concept]._links['example'].length; i++) {
				items.push(concepts[concept]._links['example'][i].id);
			}
		} else {
			items.push(concepts[concept].id);
		}
	}
	return items;
	// return (_.map( items, function(c){ return c.id; }));
}

var fetchISA = function(concepts) {
	var items = [];
	for (var concept in concepts) {
		if(concepts[concept]._links['isa']) {
			for(var i = 0; i < concepts[concept]._links['isa'].length; i++) {
				items.push(concepts[concept]._links['isa'][i].id);
			}
		} else {
			items.push(concepts[concept].id);
		}
	}
	return items;
	// return (_.map( items, function(c){ return c.id; }));
}

module.exports = FactSystem;