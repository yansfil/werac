var mongoose = require('mongoose');
var uri = 'mongodb://localhost/werac-dummy';
var options = {
  server : {poolsize : 100}
};

var db = mongoose.createConnection(uri, options);

db.on('error', function(err){
  if(err) console.error('db err', err);
})
db.once('open', function callback(){
  console.info('MongoDb connected successfully');
})

module.exports = db;
