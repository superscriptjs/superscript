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
                    // удаляю optionals - они не влияют на вес правила
                    // TODO если это не влияет на вес, значит надо удалить эти слова и из сообщения пользователя. Или сделать новые message и rule с пересечениями (как alternates)
                    var ruleWithoutOptionals = trigger.trigger.replace(/\(\?:\\s\*([\wА-я]+)\\s\*\|\\s\*\)/g, '').trim();
                    var ruleArray = ruleWithoutOptionals.split(" ");

                    var intersection = arrayIntersection(messageArray, ruleArray);
                    
                    if (intersection.length > 0) {
                        match = [];
                        match[0] = message.clean;

                        // ищутся все alternates
                        var allAlternates = trigger.trigger.match(/(\|?\(?\(\?:\^\|\\s\?\)[\wА-я\s]+\(\?:\\s\?\|\$\)[\)\\s\?]*)/g);
                        for (j = 0; j < allAlternates.length; j++) {
                            allAlternates[j] = allAlternates[j].replace(/\(?\(\?:\^\|\\s\?\)/, "");
                            allAlternates[j] = allAlternates[j].replace(/\(\?:\\s\?\|\$\)\)?\\?s?\??/, "");
                        }
                        // все найденные alternates собираются в массив, содержащий объект в котором перечислены все варианты каждого alternate 
                        // и позицию начала их в сообщении пользователя 
                        var alternates = [];
                        var messageWithoutAlternates = message.clean;
                        for (k = 0, l = -1, m = 0, f = null; k < allAlternates.length; k++) {
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
                        // Если нет - сбрасываем вес всего правила.
                        // Если да - удаляем все найденные alternates из messageWithoutAlternates
                        // и добавляем каждый вариант в массив match
                        for (i = 0; i < alternates.length; i++) {
                            alternates[i] = alternates[i].sort(function (a, b) {
                                return b.index - a.index;
                            });
                            if (alternates[i][0]['index'] == null) {
                                alternates = null;
                                break;
                            }
                        }
                        if (alternates) {
                            for (i = 0; i < alternates.length; i++) {
                                messageWithoutAlternates = messageWithoutAlternates.replace(new RegExp('(?:^|\\s+)' + alternates[i][0]['text'] + '(?:\\s+|$)'), ' ');
                                match.push(alternates[i][0]['text']);
                            }
                        }

                        //TODO пустое сообщение должно исключать альтернатс с пробелами иначе это добавится в звезды (messageWithoutAlternates)
                        // звезды циклом как альтеры
                        

                        var starPatternsArray = [
                            "\\\(\\\\S\\\+\\\(\\\?\\\:\\\\s\\\+\\\\S\\\+\\\)\\\{\\d\\\}\\\)",
                            "\\\(\\\(\\\?\\:\\\\s\\\*\\\\\\\(\\\?\\\\~\\\?\\\[\\\\wА-я-\\:\\\]\\\+\\\[\\\\\\\?\\\\\\.\\\\'\\\\,\\\\~\\\\\\\)\\\\wА-я\\\\s\\\]\\\*\\\?\\\)\\\{\\d,\\d\\\}\\\)\\\\s\\\?"
                        ];
                        var isStars, starPattern;
                        for (i = 0; i < starPatternsArray.length; i++) {
                            if (!isStars) {
                                isStars = trigger.trigger.match(new RegExp(starPatternsArray[i]));
                                if (isStars){
                                    starPattern = starPatternsArray[i];
                                }
                            }
                        }

                        if (isStars) {
                            //создаю паттерн, содержащий только текст (без звезд) в правиле
                            //var txtOnlyPattern = trigger.trigger.replace(new RegExp(starPattern, 'g'), '').trim();
                            //разбиваю паттерн только текста на массив
                            //var txtOnlyPatternArray = txtOnlyPattern.split(' ');
                            var txtOnlyPatternArray = ruleArray;
                            var txtOnlyPattern = ruleArray.join(' ');
                            //из всего сообщения удаляю только текст, остаются только звезды.
                            var starsOnlyMessage = messageArray.filter(function(val) {
                                if (txtOnlyPatternArray) return txtOnlyPatternArray.indexOf(val) == -1;
                                else return messageArray;
                            });
                            
                            var nums = trigger.trigger.match(/\)\{(\d|\d,\d)\}\)/);
                            var min, max;
                            var matchedStarsArray = null;
                            if (nums) {
                                min = nums[1].match(/(\d),/)
                                if (min) {
                                    min = parseInt(min[1]);
                                    max = nums[1].match(/,(\d)/);
                                    max = parseInt(max[1]);
                                } else {
                                        min = nums[1].match(/\d/);
                                        min = parseInt(min[0]) + 1;
                                        max = min;
                                }
                                if (starsOnlyMessage.length <= max && starsOnlyMessage.length >= min) {
                                    matchedStarsArray = starsOnlyMessage;
                                }
                            }
                            
                            //создаю паттерн, содержащий только звезды (применяя удаление по паттерну только текста). Чтобы остались все встречающиеся указания на звезды.
                            
                            var txtOnlyMessageArray = messageArray.filter(function(val) {
                                if (matchedStarsArray) return matchedStarsArray.indexOf(val) == -1;
                                else return messageArray;
                            });
                            // объединяем все найденные слова-звезды и в сообщение и в правило
                            if (matchedStarsArray) {
                                ruleArray = txtOnlyPatternArray.concat(matchedStarsArray);
                                messageArray = txtOnlyMessageArray.concat(matchedStarsArray);
                            } 
                            else {
                                var starsOnlyPattern = trigger.trigger.replace(txtOnlyPattern, '').trim();
                                ruleArray = txtOnlyPatternArray.concat(starsOnlyPattern.split(' '));
                                messageArray = txtOnlyMessageArray;
                            }
                            // ищем пересечения новых массивов правила и сообщения
                            intersection = arrayIntersection(messageArray, ruleArray);
                            if (matchedStarsArray) match.push(matchedStarsArray.join(' '));
                        }
                        if (isStars && !matchedStarsArray || alternates == null) {
                            match = null;
                        } else {
                            match = match;
                            match[0] = message.clean;
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