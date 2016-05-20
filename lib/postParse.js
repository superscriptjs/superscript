var _ = require("lodash");

// This function can be done after the first and contains the
// user object so it may be contextual to this user.
exports.postParse = function (regexp, message, user, callback) {
  if (_.isNull(regexp)) {
    callback(null);
  } else {
    if (regexp.indexOf("<name") > -1 && message.names.length !== 0) {
      // TODO - Scan ahead to detect the highest
      for (i = 0; i < message.names.length; i++) {
        var varNamesRE = new RegExp("<name" + (i + 1) + ">", "g");
        regexp = regexp.replace(varNamesRE, "(" + message.names[i] + ")");
      }
      var nameRE = new RegExp("<name>", "g");
      var namesRE = new RegExp("<names>", "g");
      regexp = regexp.replace(nameRE, "(" + message.names[0] + ")");
      regexp = regexp.replace(namesRE, "(" + message.names.join("|") + ")");
    }

    if (regexp.indexOf("<noun") > -1 && message.nouns.length !== 0) {
      for (i = 0; i < message.nouns.length; i++) {
        var varNounsRE = new RegExp("<noun" + (i + 1) + ">", "g");
        regexp = regexp.replace(varNounsRE, "(" + message.nouns[i] + ")");
      }
      var nounRE = new RegExp("<noun>", "g");
      var nounsRE = new RegExp("<nouns>", "g");
      regexp = regexp.replace(nounRE, "(" + message.nouns[0] + ")");
      regexp = regexp.replace(nounsRE, "(" + message.nouns.join("|") + ")");
    }

    if (regexp.indexOf("<adverb") > -1 && message.adverbs.length !== 0) {
      for (i = 0; i < message.adverbs.length; i++) {
        var varAdverbRE = new RegExp("<adverb" + (i + 1) + ">", "g");
        regexp = regexp.replace(varAdverbRE, "(" + message.adverbs[i] + ")");
      }
      var adverbRE = new RegExp("<adverb>", "g");
      var adverbsRE = new RegExp("<adverbs>", "g");
      regexp = regexp.replace(adverbRE, "(" + message.adverbs[0] + ")");
      regexp = regexp.replace(adverbsRE, "(" + message.adverbs.join("|") + ")");
    }

    if (regexp.indexOf("<verb") > -1 && message.verbs.length !== 0) {
      for (var i = 0; i < message.verbs.length; i++) {
        var varVerbRE = new RegExp("<verb" + (i + 1) + ">", "g");
        regexp = regexp.replace(varVerbRE, "(" + message.verbs[i] + ")");
      }
      regexp = regexp.replace(new RegExp("<verb>", "g"), "(" + message.verbs[0] + ")");
      regexp = regexp.replace(new RegExp("<verbs>", "g"), "(" + message.verbs.join("|") + ")");
    }

    if (regexp.indexOf("<pronoun") > -1 && message.pronouns.length !== 0) {
      for (i = 0; i < message.pronouns.length; i++) {
        var varProRE = new RegExp("<pronoun" + (i + 1) + ">", "g");
        regexp = regexp.replace(varProRE, "(" + message.pronouns[i] + ")");
      }
      var proRE = new RegExp("<pronoun>", "g");
      var prosRE = new RegExp("<pronouns>", "g");
      regexp = regexp.replace(proRE, "(" + message.pronouns[0] + ")");
      regexp = regexp.replace(prosRE, "(" + message.pronouns.join("|") + ")");
    }

    if (regexp.indexOf("<adjective") > -1 && message.adjectives.length !== 0) {
      for (i = 0; i < message.adjectives.length; i++) {
        var varAdjRE = new RegExp("<adjective" + (i + 1) + ">", "g");
        regexp = regexp.replace(varAdjRE, "(" + message.adjectives[i] + ")");
      }

      var adjRE = new RegExp("<adjective>", "g");
      var adjsRE = new RegExp("<adjectives>", "g");
      regexp = regexp.replace(adjRE, "(" + message.adjectives[0] + ")");
      regexp = regexp.replace(adjsRE, "(" + message.adjectives.join("|") + ")");
    }

    if (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
      // Filter in <input> and <reply> tags.
      debug("Input, Reply Match Found");
      var types = ["input", "reply"];
      for (i = 0; i < 2; i++) {
        var type = types[i];
        // Numbered Replies/Inputs 1 - 9
        for (var j = 1; j <= 9; j++) {
          if (regexp.indexOf("<" + type + j + ">") && user.__history__[type][j]) {
            var historyRE = new RegExp("<" + type + j + ">", "g");
            regexp = regexp.replace(historyRE, user.__history__[type][j].raw);
          }
        }

        // Generic Reply/Input (first one)
        if (user.__history__[type][0]) {
          var hisRE = new RegExp("<" + type + ">", "g");
          regexp = regexp.replace(hisRE, user.__history__[type][0].raw);
        }
      }
    }
  }

  callback(regexp);
};