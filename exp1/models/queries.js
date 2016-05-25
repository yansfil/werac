require('../models/model')
var db = require('../models/db');
var UserModel = db.model('User');
var ItemModel = db.model('Item');
var async = require('async');


exports.getUsers = function(callback){
async.series([
  function(callbacks){
    UserModel.find({},function(err,docs){
      if(err) return callbacks(err);
      callbacks(null,docs);
    });
  }
],function(err,result){
  callback(result[0]);
});
};

exports.getList = function(status, callback){
  switch (status) {
    case 0:
      ItemModel.find({},'_id status title title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
    case 1:
      ItemModel.find({status: 1},'_id status title title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
    case 2:
      ItemModel.find({status: {$ne : 1}},'_id status title title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
  }
};

exports.getDetailList = function(mid,callback){
  ItemModel.find({_id:mid},'-comments.reply',function(err,docs){
    if(err){
      err.code =500;
      return callback(err);
    }
    callback(docs);
  });
};

exports.getProfile = function(status,uid,callback){
  switch(status){
    case "my" :
      UserModel.findOne({_id : uid }).populate({
        path : 'history_create history_join history_like history_mc',
        select : 'title subtitle location_area date like has_mc status'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
    case "mc" :
      UserModel.find({_id : uid },'-phone -history_create -history_join -history_like -alarm').populate({
        path : 'history_create history_join history_like history_mc',
        select : 'title subtitle location_area date like has_mc status'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
    case "creator" :
      UserModel.find({_id : uid }, '-phone -history_mc -history_join -history_like -alarm').populate({
        path : 'history_create history_join history_like history_mc',
        select : 'title subtitle location_area date like has_mc status'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(err);
        }
        callback(docs);
      });
      break;
  }
};
