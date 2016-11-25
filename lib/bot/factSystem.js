'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sfacts = require('sfacts');

var _sfacts2 = _interopRequireDefault(_sfacts);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var coreFacts = null;

var createFactSystem = function createFactSystem(mongoURI, _ref, callback) {
  var clean = _ref.clean,
      importData = _ref.importData;

  // TODO: On a multitenanted system, importing data should not do anything
  if (importData) {
    return _sfacts2.default.load(mongoURI, importData, clean, function (err, factSystem) {
      coreFacts = factSystem;
      callback(err, factSystem);
    });
  }
  return _sfacts2.default.create(mongoURI, clean, function (err, factSystem) {
    coreFacts = factSystem;
    callback(err, factSystem);
  });
};

var createFactSystemForTenant = function createFactSystemForTenant() {
  var tenantId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'master';

  return coreFacts.createUserDB('' + tenantId);
};

exports.default = {
  createFactSystem: createFactSystem,
  createFactSystemForTenant: createFactSystemForTenant
};