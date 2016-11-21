import facts from 'sfacts';

let coreFacts = null;

const createFactSystem = function createFactSystem(mongoURI, { clean, importData }, callback) {
  // TODO: On a multitenanted system, importing data should not do anything
  if (importData) {
    return facts.load(mongoURI, importData, clean, (err, factSystem) => {
      coreFacts = factSystem;
      callback(err, factSystem);
    });
  }
  return facts.create(mongoURI, clean, (err, factSystem) => {
    coreFacts = factSystem;
    callback(err, factSystem);
  });
};

const createFactSystemForTenant = function createFactSystemForTenant(tenantId = 'master') {
  return coreFacts.createUserDB(`${tenantId}`);
};

export default {
  createFactSystem,
  createFactSystemForTenant,
};
