import mongoose from 'mongoose';
mongoose.Promise = global.Promise;

export default (mongoURI) => {
  const db = mongoose.createConnection(`${mongoURI}`);

  db.on('error', console.error);

  // If you want to debug mongoose
  // mongoose.set('debug', true);

  return db;
};
