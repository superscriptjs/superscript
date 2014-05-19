exports.letterLookup = function(cb) {
	
	var math = require("../../lib/math");
	var user = rs.currentUser();
	var msg = this._users[user].orig_message
	var parts = msg.split(" ");
	
	var lastWord = parts.pop();
	var alpha = "abcdefghijklmonpqrstuvwxyz".split("");
	var pos = alpha.indexOf(lastWord);

	// if (msg.indexOf("before") != -1) {
	// 	if (alpha[pos - 1]) {
	// 		return alpha[pos - 1].toUpperCase();
	// 	} else {
	// 		return {
	// 			reply :"Don't be silly, there is nothing before A"
	// 		}
	// 	}
	// } else if (msg.indexOf("after") != -1) {
	// 	if (alpha[pos + 1]) {
	// 		return alpha[pos + 1].toUpperCase();
	// 	} else {
	// 		return {
	// 			reply :"haha, funny."
	// 		}
	// 	}
	// } else {
	// 	var i = parts.indexOf("letter");
	// 	var loc = parts[i - 1];

	// 	if (loc == "first") {
	// 		return "A";
	// 	} else if (loc == "last") {
	// 		return "Z";
	// 	} else {

	// 		// Number or word number
	// 		// 1st, 2nd, 3rd, 4th or less then 99
	// 		if (loc.indexOf("st") == 1 || loc.indexOf("nd") == 1 || loc.indexOf("rd") == 1|| loc.indexOf("th") == 1 || loc.length < 3) {
	// 			if (parseInt(loc) > 0 && parseInt(loc) <= 26) {
	// 				return alpha[parseInt(loc) - 1].toUpperCase();	
	// 			} else {
	// 				return {
	// 					reload: true,
	// 					reply :"seriously..."
	// 				}
	// 			}
	// 		} else {
	// 			var num = math.cardPlural(loc);
	// 			return alpha[num - 1].toUpperCase(); 
	// 		}
	// 	}
	// }	
}
