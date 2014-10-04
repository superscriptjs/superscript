var debug   = require("debug")("AutoReply:NumReply");
var _       = require("underscore");
var history = require("../history");

var ArithGeo = function(arr) { 
  var ap, gp;

  for (i = 0; i< (arr.length - 2); i++)  
      if(!(ap = arr[i+1] - arr[i] == arr[i+2] - arr[i+1])) break; 

  if(ap) return "Arithmetic";
  for (i = 0; i< (arr.length - 2); i++)  
      if(!(gp = arr[i+1] / arr[i] == arr[i+2] / arr[i+1])) break;

  if(gp) return "Geometric";
  return -1;    
};


module.exports = function(message, facts, cnet, user, cb) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "code": suggest = "I'm not sure what the phone number is"; break;
    case "count":
      var candidates = history(user, { nouns: message.nouns});
      if (candidates.length != 0 && candidates[0].numbers[0]) {
        suggest = " It is " + candidates[0].numbers[0] + ".";
      } else {
        if (_.contains(message.pnouns, "i") || _.contains(message.pnouns, "my")) {
          suggest = "I don't think you told me, how many?"
        } else {
          suggest = "I don't know, how many?"
        }
      }
      break;
    
    case "date":
      // TODO - Check pronouns for "I" or "My"
      if (_.contains(message.pnouns, "my") ) {
        var candidates = history(user, { date: true });
        if (candidates.length != 0) {
          // TODO - This is weak
          suggest = "It is in "+ candidates[0].date.format("MMMM") + ".";
        } else {
          suggest = "I don't think you told me, when is it?"
        }
      } else {
         suggest = "I'm not sure when that was."
      }
    break;
    case "period":
      // How old is he/she
      // How old am
      if (_.contains(message.pnouns, "he") || 
          _.contains(message.pnouns, "she") || 
          _ .contains(message.cNouns, "i")){
        var candidates = history(user, { numbers: true });
        if (message.pnouns[0]) {
          suggest = message.pnouns[0] + " is " + candidates[0].numbers[0];
        } else {
          suggest = "You are " + candidates[0].numbers[0];
        }
        
        break;
      }

    case "time":
      // When is ...
      var candidates = history(user, { date: true });
      if (candidates.length != 0) {
        suggest = candidates[0].date.fromNow(true) + ".";
      } else {
        suggest = "I don't think you told me, when is it?"
      }
    break;
    case "dist":  
      var candidates = history(user, { nouns: message.nouns });
      if (candidates.length != 0) {
        suggest = candidates[0].numbers[0]
      } else {
        suggest = "A few kilometers.";
      }

    break;
    case "money": 
      var candidates = history(user, { nouns: message.nouns, money: true });
      if (candidates.length != 0) {
        suggest = "It would cost $" + candidates[0].numbers[0] + ".";
      }
    break;
    case "order": break;
    case "other": 
      // What number are missing 1, 3, 5, 7
      if (message.lemWords.indexOf("missing") != -1 && message.numbers.length != 0) {
        debug("Finding the Missing number")
        var numArray = message.numbers.sort();
        var mia = [];
        for(var i = 1; i < numArray.length; i++) {
          if(numArray[i] - numArray[i-1] != 1) {
            var x = numArray[i] - numArray[i-1];
            var j = 1;
            while (j < x) {
              mia.push(parseFloat(numArray[i-1])+j);
              j++;
            }
          }
        }
        debug("Missing Numbers", mia)
        var s = mia.sort(function(a, b){return a-b});
        suggest = "I think it is " + s.join(" ");
      }
      // Sequence
      if (message.lemWords.indexOf("sequence") != -1 && message.numbers.length != 0) {
        debug("Finding the next number in the series")
        var numArray = message.numbers.map(function(item){return parseInt(item)})
        numArray = numArray.sort(function(a, b){return a-b});
        
        if (ArithGeo(numArray) == "Arithmetic") {
          for(var i = 1; i < numArray.length; i++) {
            var x = numArray[i] - numArray[i-1];
          }
          suggest = "I think it is " + (parseInt(numArray.pop()) + x);
        } else if (ArithGeo(numArray) == "Geometric") {
          var a = numArray[1];
          var r = a / numArray[0];
          suggest = "I think it is " + numArray.pop() * r;
        }
      }
    break;
    case "percent": suggest = "42 percent or more";  break;
    case "speed":  suggest = "42km per hour"; break;
    case "temp":  suggest = "42 degrees"; break;
    case "size":  suggest = "42 inches"; break;
    case "volsize": suggest = "42 inches"; break;
    case "weight":  suggest = "42lbs"; break;
  }

  cb(null, suggest);
}