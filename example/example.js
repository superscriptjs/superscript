var script = require("../index");
var bot = new script();

bot.loadDirectory("./topics", function(err, res) {
	if (!err) {
		// bot.reply("this is a test", function(err, result){
		// 	console.log(">", result);
		// })
	
		// bot.reply("what is the definition of bridge", function(err, result){
		// 	console.log(">", result);
		// });

		// bot.reply("what season is it?", function(err, result){
		// 	console.log(">", result);
		// })

		// ( I * ~like * _~meat * and * _~vegetable ) I hate _0 and _1	
		bot.reply("I love beef", function(err, result){
			console.log(">", result);
		});

	}
});

