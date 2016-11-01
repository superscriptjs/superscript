import facts from 'sfacts';

const createFactSystem = function createFactSystem(mongoURI, { clean, importData }, callback) {
  if (importData) {
    return facts.load(mongoURI, importData, clean, callback);
  }
  return facts.create(mongoURI, clean, callback);
};

export default createFactSystem;
