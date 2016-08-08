// These are shared helpers for the models.

var async = require("async");
var debug = require("debug-levels")("SS:Common");
var postParse = require("../postParse");
var Utils = require("../utils");
var _ = require("lodash");

module.exports = function(mongoose) {
    var getReply = function() {
        return mongoose.model('Reply');
    };
    var getGambit = function() {
        return mongoose.model('Gambit');
    };
    var getCondition = function() {
        return mongoose.model('Condition');
    };
    var getTopic = function() {
        return mongoose.model('Topic');
    };

    var _walkReplyParent = function(repId, replyIds, cb) {
        getReply().findById(repId)
            .populate("parent")
            .exec(function(err, reply) {
                if (err) {
                    debug.error(err);
                }


                debug.info("Walk", reply);

                if (reply) {
                    replyIds.push(reply._id);

                    if (reply.parent && reply.parent.parent) {
                        _walkReplyParent(reply.parent.parent, replyIds, cb);
                    } else {
                        cb(null, replyIds);
                    }
                } else {
                    cb(null, replyIds);
                }
            });
    };

    var _walkGambitParent = function(gambitId, gambitIds, cb) {
        getGambit().findOne({
                _id: gambitId
            })
            .populate("parent")
            .exec(function(err, gambit) {
                if (err) {
                    console.log(err);
                }

                if (gambit) {
                    gambitIds.push(gambit._id);
                    if (gambit.parent && gambit.parent.parent) {
                        _walkGambitParent(gambit.parent.parent, gambitIds, cb);
                    } else {
                        cb(null, gambitIds);
                    }
                } else {
                    cb(null, gambitIds);
                }
            });
    };

    // This will find all the gambits to process by parent (topic or conversation)
    var eachGambit = function(type, id, options, callback) {
        // Lets Query for Gambits

        var execHandle = function(err, mgambits) {

            if (err) {
                console.log(err);
            }

            var populateGambits = function(gambit, cb) {
                getReply().populate(gambit, {
                    path: "replies"
                }, cb);
            };

            async.each(mgambits.gambits, populateGambits, function populateGambitsComplete(err2) {
                if (err2) {
                    console.log(err2);
                }
                async.map(mgambits.gambits, _eachGambitHandle(options),
                    function eachGambitHandleComplete(err3, matches) {
                        callback(null, _.flatten(matches));
                    }
                );
            });
        };

        if (type === "topic") {
            debug.verbose("Looking back Topic", id);
            getTopic().findOne({
                    _id: id
                }, "gambits")
                .populate({
                    path: "gambits",
                    match: {
                        isCondition: false
                    }
                })
                .exec(execHandle);
        } else if (type === "reply") {
            debug.verbose("Looking back at Conversation", id);
            getReply().findOne({
                    _id: id
                }, "gambits")
                .populate({
                    path: "gambits",
                    match: {
                        isCondition: false
                    }
                })
                .exec(execHandle);
        } else if (type === "condition") {
            debug.verbose("Looking back at Conditions", id);
            getCondition().findOne({
                    _id: id
                }, "gambits")
                .populate("gambits")
                .exec(execHandle);
        } else {
            debug.verbose("We should never get here");
            callback(true);
        }
    };

    var _afterHandle = function(match, matches, trigger, topic, cb) {
        debug.verbose("Match found", trigger, match);
        debug.info("Match found '" + trigger.input + "' in topic '" + topic + "'");

        var stars = [];
        if (match.length > 1) {
            for (var j = 1; j < match.length; j++) {
                if (match[j]) {
                    var starData = Utils.trim(match[j]);
                    // Concepts are not allowed to be stars or captured input.
                    starData = (starData[0] == "~") ? starData.substr(1) : starData;
                    stars.push(starData);
                }
            }
        }

        var data = {
            disorderedWeight: match.disorderedWeight,
            stars: stars,
            trigger: trigger
        };
        if (topic !== "reply") {
            data.topic = topic;
        }

        matches.push(data);
        cb(null, matches);
    };

    var _doesMatch = function(trigger, message, user, callback) {

        var match = false;

        postParse.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
            var pattern = new RegExp("^" + regexp + "$", "i");

            debug.verbose("Try to match (clean)'" + message.clean + "' against " + trigger.trigger + " (" + regexp + ")");
            debug.verbose("Try to match (lemma)'" + message.lemString + "' against " + trigger.trigger + " (" + regexp + ")");
            debug.verbose('trigger.isDisordered ' + trigger.isDisordered);

            // Match on the question type (qtype / qsubtype)
            if (trigger.isQuestion && message.isQuestion) {

                if (_.isEmpty(trigger.qSubType) && _.isEmpty(trigger.qType) && message.isQuestion === true) {
                    match = message.clean.match(pattern);
                    if (!match) {
                        match = message.lemString.match(pattern);
                    }
                } else {
                    if ((!_.isEmpty(trigger.qType) && message.qtype.indexOf(trigger.qType) !== -1) ||
                        message.qSubType === trigger.qSubType) {
                        match = message.clean.match(pattern);
                        if (!match) {
                            match = message.lemString.match(pattern);
                        }
                    }
                }
            } else {
                // This is a normal match
                if (trigger.isQuestion === false && trigger.isDisordered === false) {
                    match = message.clean.match(pattern);
                    if (!match) {
                        match = message.lemString.match(pattern);
                    }
                    if (!match) {
                        match = message.original.match(pattern);
                    }
                    if (match) {
                        match.disorderedWeight = 1;
                    }
                }
                // This is a disordered match
                if (trigger.isDisordered === true) {
                    var messageArray = message.raw.split(" ");
                    var ruleArray = trigger.trigger.split(' ');

                    //ищем optonals
                    var optionalsPatternRx = /\(\?\:\\s\*[\wА-я]+\\s\*\|\\s\*\)/g;
                    var optionals = optionalsPatternRx.test(trigger.trigger);
                    if (optionals) {
                        optionals = trigger.trigger.match(optionalsPatternRx);
                        var messageWithoutOptionals = [];
                        for (var i = 0; i < optionals.length; i++) {
                            optionals[i] = optionals[i].replace(/\(\?\:\\s\*/, '');
                            optionals[i] = optionals[i].replace(/\\s\*\|\\s\*\)/, '');
                            for (var j = 0; j < messageArray.length; j++) {
                                if (messageArray[j] != optionals[i]) messageWithoutOptionals.push(messageArray[j]);   
                            }
                        }
                        var ruleWithoutOptionals = trigger.trigger.replace(optionalsPatternRx, '').trim();
                        ruleArray = ruleWithoutOptionals.split(' ');

                        if (messageWithoutOptionals.length > 0) messageArray = messageWithoutOptionals; 
                    };

                    // проверяем массив на наличие шаблона, содержащего только * и вытаскиваем этот шаблон в отдельный элемент массива
                    // все остальные слова разбиваются по пробелу, но этот не может перед собой содержать пробел.
                    for (var i = 0, m, rx = /\\s\*\(\?\:\.\*\\s\?\)/; i < ruleArray.length; i++) {
                        m = rx.test(ruleArray[i]);
                        if (m) {
                            ruleArray[i] = ruleArray[i].replace(rx, '');
                            ruleArray.splice(i, 0, '\\s*(?:.*\\s?)');
                            i++;
                        }
                    }
                    var intersection = arrayIntersection(messageArray, ruleArray);                    

                    if (intersection.length > 0) {
                        match = [];
                        match[0] = message.clean;

                        // ищутся все alternates
                        var alternatePatternRx = /(\|?\(?\(\?:\^\|\\s\?\)[\wА-я\s]+\(\?:\\s\?\|\$\)[\)\\s\?]*)/g;
                        var allAlternates = alternatePatternRx.test(trigger.trigger);
                        if (allAlternates) {
                            allAlternates = trigger.trigger.match(alternatePatternRx);
                            for (var j = 0; j < allAlternates.length; j++) {
                                allAlternates[j] = allAlternates[j].replace(/\(?\(\?:\^\|\\s\?\)/, "");
                                allAlternates[j] = allAlternates[j].replace(/\(\?:\\s\?\|\$\)\)?\\?s?\??/, "");
                            }
                            // создаем правило без alternates
                            var ruleWittoutAlternates = [];
                            for (var i = 0, j = 0, t1, t2; i < ruleArray.length; i++) {
                                t1 = /\(\?:\^\|\\s\?\)/.test(ruleArray[i]);
                                t2 = /\(\?\:\\s\?\|\$\)/.test(ruleArray[i]);
                                if(!t1 && !t2) {
                                    ruleWittoutAlternates[j] = ruleArray[i];
                                    j++;
                                }
                            }

                            // все найденные alternates собираются в массив, содержащий объект в котором перечислены все варианты каждого alternate 
                            // и позицию начала их в сообщении пользователя 
                            var alternates = [];
                            //var messageWithoutAlternates = message.clean;
                            var messageWithoutAlternates = messageArray.join(' ');
                            for (var k = 0, l = -1, m = 0, f = null; k < allAlternates.length; k++) {
                                if (allAlternates[k][0] == '|') {
                                    alternates[l][m] = {};
                                    alternates[l][m]['text'] = allAlternates[k].slice(1);
                                    f = messageWithoutAlternates.match('(?:^|\\s+)' + alternates[l][m]['text'] + '(?:\\s+|$)');
                                    if (f) {
                                        alternates[l][m]['index'] = f['index'];
                                    } else alternates[l][m]['index'] = null;
                                    m++;
                                }
                                else {
                                    l++;
                                    m = 0;
                                    alternates[l] = [];
                                    alternates[l][m] = {};
                                    alternates[l][m]['text'] = allAlternates[k]
                                    f = messageWithoutAlternates.match('(?:^|\\s+)' + alternates[l][m]['text'] + '(?:\\s+|$)');
                                    if (f) {
                                        alternates[l][m]['index'] = f['index'];
                                    } else alternates[l][m]['index'] = null;
                                    m++;
                                }
                            }
                            // Проверяем, все ли необходимые alternates есть в сообщении (у всех объектов в массиве должны быть значения index). 
                            // Если нет - сбрасываем всё правило.
                            for (var i = 0; i < alternates.length; i++) {
                                alternates[i] = alternates[i].sort(function (a, b) {
                                    return b.index - a.index;
                                });
                                if (alternates[i][0]['index'] == null) {
                                    match = false;
                                    break;
                                }
                            }
                            // Если всё ок - удаляем все найденные alternates из messageWithoutAlternates
                            // и добавляем каждый вариант в массив match
                            if (match) {
                                for (var i = 0; i < alternates.length; i++) {
                                    messageWithoutAlternates = messageWithoutAlternates.replace(new RegExp('(?:^|\\s+)' + alternates[i][0]['text'] + '(?:\\s+|$)'), ' ').trim();
                                    match.push(alternates[i][0]['text']);
                                }
                            }
                            messageWithoutAlternates = messageWithoutAlternates.split(' ');
                        }

                        var starPatternsArray = [
                            "\\\\s\\\*\\\(\\\?\\\:\\\.\\\*\\\\s\\\?\\\)", // *
                            "\\\(\\\\S\\\+\\\(\\\?\\\:\\\\s\\\+\\\\S\\\+\\\)\\\{\\d\\\}\\\)", //*n
                            "\\\(\\\(\\\?\\:\\\\s\\\*\\\\\\\(\\\?\\\\~\\\?\\\[\\\\wА-я-\\:\\\]\\\+\\\[\\\\\\\?\\\\\\.\\\\'\\\\,\\\\~\\\\\\\)\\\\wА-я\\\\s\\\]\\\*\\\?\\\)\\\{\\d,\\d\\\}\\\)\\\\s\\\?" // *~n и *(n-m)
                        ];
                        
                        // ищутся все паттерны звезд
                        var foundStarPatterns = [];
                        var ruleWithoutStars = [];
                        
                        if (ruleWittoutAlternates) ruleArray = ruleWittoutAlternates;
                        for (var i = 0; i < ruleArray.length; i++) {
                            var m = false;
                            var f = false;
                            var t = '';
                            for (var j = 0; j < starPatternsArray.length; j++) {
                                m = ruleArray[i].match(starPatternsArray[j]);
                                if (m) {
                                    foundStarPatterns.push(m[0]);
                                    t = ruleArray[i].replace(m[0], '');
                                    f = true;
                                    break;
                                }
                            } 
                            if (!f) ruleWithoutStars.push(ruleArray[i]);
                            if (t != '') ruleWithoutStars.push(t);
                        };

                        // если есть звезды в правиле и match не сброшено в поиске alternates
                        if (foundStarPatterns.length > 0 && match) {
                            if (ruleWithoutStars.length > 0) ruleArray = ruleWithoutStars;
                            var messageStarsOnly
                            if (messageWithoutAlternates) messageStarsOnly = messageWithoutAlternates;
                            else messageStarsOnly = messageArray;
                            //создается массив, содержащий только звезды, найденные в сообщении.
                            // TODO тут удаляются все встречающиеся слова. и если есть правило ой * и вопрос
                            // ой ой ой он удалит все "ой", а должен только первое
                            messageStarsOnly = messageStarsOnly.filter(function(val){
                                if (ruleArray) return ruleArray.indexOf(val) == -1;
                                else return messageStarsOnly;
                            });

                            // массив foundStars содержит массивы со словами для каждого шаблона правила.
                            var foundStars = [];
                            for (var i = 0, k = 0; i < foundStarPatterns.length; i++) {
                                // if *
                                if (foundStarPatterns[i] == '\\s*(?:.*\\s?)'){
                                    foundStars[k] = {};
                                    foundStars[k]['text'] = messageStarsOnly.join(' ');
                                    foundStars[k]['captured'] = false;
                                    messageStarsOnly = [];
                                } 
                                // if *n *~n *(n-m)
                                if (messageStarsOnly.length > 0) {
                                    var nums = foundStarPatterns[i].match(/\)\{(\d|\d,\d)\}\)/);
                                    if (nums) {
                                        var min = nums[1].match(/(\d),/);
                                        var max;
                                        var count;
                                        if (min) {
                                            min = parseInt(min[1]);
                                            max = nums[1].match(/,(\d)/);
                                            max = parseInt(max[1]);
                                        } else {
                                                min = nums[1].match(/\d/);
                                                min = parseInt(min[0]) + 1;
                                                max = min;
                                        }
                                        if (messageStarsOnly.length >= min && messageStarsOnly.length != 0) {
                                            if (messageStarsOnly.length >= max) count = max;    
                                            else count = messageStarsOnly.length;
                                            foundStars[k] = {};
                                            foundStars[k]['text'] = '';
                                            foundStars[k]['captured'] = true;
                                            do {
                                                foundStars[k]['text'] += messageStarsOnly[0] + ' ';
                                                messageStarsOnly.splice(0, 1);
                                                count--;
                                            } while (count > 0);
                                            k++;
                                        }
                                    }
                                } 
                            }
                            // если все шаблоны набраны, и после этого нет лишних слов в messageStarsOnly 
                            // (то есть отработаны все шаблоны по максимальному их значению) 
                            // то foundStars добавляются в match
                            // иначе foundStars обнуляется, чтобы ниже сбросить вес правила.
                            if (foundStars.length != foundStarPatterns.length) match = false;
                            else if (messageStarsOnly.length > 0) match = false;
                            else {
                                for (var i = 0; i < foundStars.length; i++) {
                                    if (foundStars[i]['captured']) match.push(foundStars[i]['text'].trim());
                                }
                            }
                        }

                        // если match нигде выше (в поиске alternates или stars) не сброшено
                        // то ищем новые пересечения со всеми добавленнными alternates и stars и добавляем это в вес правила 
                        if (match) {
                            //добавляем найденные звезды в правило
                            if (foundStars) {
                                for (i = 0, m = []; i < foundStars.length; i++) {
                                    m = foundStars[i]["text"].trim().split(' ');
                                    ruleArray = ruleArray.concat(m);
                                }
                            }
                            // добавляем найденные alternates
                            if (alternates) {
                                for (i = 0, m = []; i < alternates.length; i++) {
                                    m = alternates[i][0]["text"].split(' ');
                                    ruleArray = ruleArray.concat(m);
                                }
                            }
             
                            intersection = arrayIntersection(ruleArray, messageArray);
                            match.disorderedWeight = intersection.length / messageArray.length * intersection.length / ruleArray.length;
                        }
                    }
                }
            }
            callback(null, match);
        });
    };

        // This is the main function that looks for a matching entry
        var _eachGambitHandle = function(options) {
            var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

            return function(trigger, callback) {

                var match = false;
                var matches = [];

                var message = options.message;
                var user = options.user;
                var plugins = options.plugins;
                var scope = options.scope;
                var topic = options.topic || "reply";

                _doesMatch(trigger, message, user, function(err, match) {

                    if (match) {
                        if (trigger.filter !== "") {
                            // We need scope and functions
                            debug.verbose("We have a filter function", trigger.filter);

                            var filterFunction = trigger.filter.match(filterRegex);
                            debug.verbose("Filter Function Found", filterFunction);

                            var pluginName = Utils.trim(filterFunction[1]);
                            var partsStr = Utils.trim(filterFunction[2]);
                            var parts = partsStr.split(",");

                            var args = [];
                            for (var i = 0; i < parts.length; i++) {
                                if (parts[i] !== "") {
                                    args.push(parts[i].trim());
                                }
                            }

                            if (plugins[pluginName]) {

                                var filterScope = scope;
                                filterScope.message = options.localOptions.message;
                                filterScope.message_props = options.localOptions.messageScope;
                                filterScope.user = options.localOptions.user;

                                args.push(function customFilterFunctionHandle(err, filterReply) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    if (filterReply === "true" || filterReply === true) {
                                        debug.verbose("filterReply", filterReply);

                                        if (trigger.redirect !== "") {
                                            debug.verbose("Found Redirect Match with topic " + topic);
                                            getTopic().findTriggerByTrigger(trigger.redirect, function(err2, gambit) {
                                                if (err2) {
                                                    console.log(err2);
                                                }

                                                trigger = gambit;
                                                callback(null, matches);
                                            });

                                        } else {
                                            // Tag the message with the found Trigger we matched on
                                            message.gambitId = trigger._id;
                                            _afterHandle(match, matches, trigger, topic, callback);
                                        }
                                    } else {
                                        debug.verbose("filterReply", filterReply);
                                        callback(null, matches);
                                    }
                                });

                                debug.verbose("Calling Plugin Function", pluginName);
                                plugins[pluginName].apply(filterScope, args);

                            } else {
                                debug.verbose("Custom Filter Function not-found", pluginName);
                                callback(null, matches);
                            }
                        } else {

                            if (trigger.redirect !== "") {
                                debug.verbose("Found Redirect Match with topic");
                                getTopic().findTriggerByTrigger(trigger.redirect, function(err, gambit) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    debug.verbose("Redirecting to New Gambit", gambit);
                                    trigger = gambit;
                                    // Tag the message with the found Trigger we matched on
                                    message.gambitId = trigger._id;
                                    _afterHandle(match, matches, trigger, topic, callback);
                                });
                            } else {
                                // Tag the message with the found Trigger we matched on
                                message.gambitId = trigger._id;
                                _afterHandle(match, matches, trigger, topic, callback);
                            }
                        }
                    } else {
                        callback(null, matches);
                    }

                }); // end regexReply
            }; // end EachGambit
        };

        return {
            walkReplyParent: function(repId, cb) {
                _walkReplyParent(repId, [], cb);
            },
            walkGambitParent: function(gambitId, cb) {
                _walkGambitParent(gambitId, [], cb);
            },
            eachGambit: eachGambit,
            doesMatch: _doesMatch
        };

}; //end export

// find intersection in 2 array
function arrayIntersection(a1, a2) {
    var a2Set = new Set(a2);
    return a1.filter(function(x) {
        return a2Set.has(x);
    });
}