import facts from 'sfacts';

const createFactSystem = function createFactSystem({ name, clean, importData }, callback) {
  if (importData) {
    return facts.load(name, importData, clean, callback);
  }
  return facts.create(name, clean, callback);
};

export default createFactSystem;
