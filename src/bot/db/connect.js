import mongoose from 'mongoose';

export default (mongoURI) => {
  const db = mongoose.createConnection(`${mongoURI}`);

  db.on('error', console.error);

  // If you want to debug mongoose
  // mongoose.set('debug', true);

  return db;
};
