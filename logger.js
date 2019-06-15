const { createLogger, format, transports } = require('winston');
const { combine, timestamp, metadata, json, errors } = format;

const _transports = [];
const level = 'info';

module.exports = (loggingTransports = []) => {

  _transports.push(new transports.Console());

  if (loggingTransports === 'string') {
    _transports.push(
      new transports.File({ filename: loggingTransports })
    );
  }

  if (Array.isArray(loggingTransports)) {

    _transports.push(...loggingTransports);

  }

  const log = createLogger({
    transports: _transports,
    level,
    format: combine(
      metadata(),
      timestamp(),
      errors({ stack: true }),
      json(),
    ),
  });

  return log;

};

