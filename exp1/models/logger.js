var winston = require('winston');

var logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({level : 'info', colorize : 'all'}),
    new (winston.transports.File)({ filename: 'winston.log', level : 'warn' })
  ]
});

module.exports = logger;
