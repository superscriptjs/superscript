import mongoose from 'mongoose';

export default (mongoURI, dbName) => {
  const db = mongoose.createConnection(`${mongoURI}${dbName}`);

  db.on('error', console.error);

  // If you want to debug mongoose
  // mongoose.set('debug', true);

  return db;
};
