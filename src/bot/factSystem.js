import facts from 'sfacts';

const decorateFactSystem = function decorateFactSystem(factSystem) {
  const getFactSystem = function getFactSystem(tenantId = 'master') {
    return factSystem.createUserDB(`${tenantId}`);
  };

  return { getFactSystem };
};

const setupFactSystem = function setupFactSystem(mongoURI, { clean, importData }, callback) {
  // TODO: On a multitenanted system, importing data should not do anything
  if (importData) {
    return facts.load(mongoURI, importData, clean, (err, factSystem) => {
      callback(err, decorateFactSystem(factSystem));
    });
  }
  return facts.create(mongoURI, clean, (err, factSystem) => {
    callback(err, decorateFactSystem(factSystem));
  });
};

export default {
  setupFactSystem,
};
