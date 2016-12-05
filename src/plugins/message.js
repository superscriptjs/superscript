const addMessageProp = function addMessageProp(key, value, callback) {
  if (key !== '' && value !== '') {
    return callback(null, { [key]: value });
  }

  return callback(null, '');
};

export default { addMessageProp };
