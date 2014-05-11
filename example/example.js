
var script = require("../index");
var bot = new script();

bot.loadDirectory("./test/fixtures/redirect", function(err, res) {
	bot.reply("user1", "this is an inline redirect", function(err, reply) {
		
		console.log(reply);
	});
});

