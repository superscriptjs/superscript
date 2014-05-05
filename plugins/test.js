// This is used in a test to verify fall though works
// TODO: Move this into a fixture.
exports.bail = function(cb) {
	cb(true, null);
}
