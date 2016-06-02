require('../models/model')
var db = require('../models/db');
var UserModel = db.model('User');
var ItemModel = db.model('Item');
var async = require('async');
var crypto = require('crypto');  //패스워드 암호화 과정
// decipher.update(cipherd, 'hex', 'ascii');
// var decipherd = decipher.final('ascii');

exports.postJoin = function(user,callback){
  var cipher = crypto.createCipher('aes256','password');
  cipher.update(user.pw); //pw 암호화과정
  user.pw = cipher.final('hex');

  user.save(function(err,docs){
    if(err) return callback(0,err);
    callback(1, docs);
  })
};

exports.postLogin = function(email, pw , callback){
  var cipher = crypto.createCipher('aes256','password');
  cipher.update(pw); //pw 암호화과정
  pw = cipher.final('hex');
  UserModel.findOne({email:email, pw: pw},function(err,docs){
    if(err) return callback(0,err);
    if(docs){
      callback(1, docs);
    }else{
      callback(0, "login 실패");
    }
  })
};

exports.getUsers = function(callback){
async.series([
  function(callbacks){
    UserModel.find({},function(err,docs){
      if(err) return callbacks(err);
      callbacks(null,docs);
    });
  }
],function(err,result){
  if (err) {
    return callback(0,err.message);
  }
  callback(1,result[0]);
});
};

exports.getList = function(status, callback){
  switch (status) {
    case 0:
      ItemModel.find({},'_id status image image_size title title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
    case 1:
      ItemModel.find({status: 1},'_id status image image_size title title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
    case 2:
      ItemModel.find({status: {$ne : 1}},'_id status title image image_size title_sub location_area date start_date like has_mc',function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
  }
};

exports.getDetailList = function(mid,callback){
  ItemModel.find({_id:mid},function(err,docs){
    if(err){
      err.code =500;
      return callback(0,err);
    }
    callback(1,docs);
  });
};

exports.getProfile = function(status,uid,callback){
  switch(status){
    case "my" :
      UserModel.findOne({_id : uid }).populate({
        path : 'history_create history_join history_like history_mc',
        select : '_id status image title title_sub location_area date start_date like has_mc'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
    case "mc" :
      UserModel.find({_id : uid },'-phone -history_create -history_join -history_like -alarm').populate({
        path : 'history_create history_join history_like history_mc',
        select : 'title subtitle location_area date like has_mc status'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
    case "creator" :
      UserModel.find({_id : uid }, '-phone -history_mc -history_join -history_like -alarm').populate({
        path : 'history_create history_join history_like history_mc',
        select : 'title subtitle location_area date like has_mc status'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
  }
};

exports.getGuestLists = function(mid, callback){
  ItemModel.find({_id:mid},'-_id guests_id').populate({
    path : 'guests_id',
    select : 'image name phone'
  }).exec(function(err,docs){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    callback(1,docs[0]);
  });
};

exports.postItem = function(item,callback){
  item.save(function(err,docs1){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    UserModel.update({_id : item.uid}, {$push: {history_create : docs1._id }},function(err,docs2){
      if(err){
        err.code = 500;
        return callback(0,err);
      }
        callback(1,docs1);
    })
  });
};

exports.postUpdatedItem = function(mid, item, callback){
  async.series([
    function(callback1){
      ItemModel.update({_id:mid},{$set:item},function(err,docs1){
        if(err){
          err.code = 500;
          return callback1(err);
        }
        callback1(null);
      });
    },function(callback1){
      ItemModel.findOne({_id:mid},function(err,docs2){
        callback1(null,docs2);
      })
    }
  ],function(err,result){
    if(err) return callback(0,err.message);
    callback(1,result[1]);
  });
};


exports.postLike = function(mid,uid,callback){
  UserModel.find({_id:uid, history_like:mid},function(err,docs){
    // console.log("docs", docs.length);
  if(err){
    err.code = 500;
    return callback(0,err);
  }
  if(docs.length==0){ // 유저의 좋아요 목록에 없다면
    async.series([
      function(callback2){
      ItemModel.update({_id:mid},{$inc:{like : 1}},function(err,docs){
        console.log('item의 like 올리기');
        callback2(null,docs);
      })
    },function(callback2){
      UserModel.update({_id:uid},{$push:{history_like : mid}},function(err,docs){
        console.log('user의 history_like 넣기');
        callback2(null,docs);
      })
    }],function(err,result){
      if (err) {
        return callback(0,err.message);
      }
      callback(1,"좋아요 추가");
    });
  }else{  // 유저의 좋아요 목록에 있다면
    async.series([
    function(callback3){
    ItemModel.update({_id:mid},{$inc:{like : -1}},function(err,docs){
      console.log('item의 like 내리기');
      callback3(null,docs);
    })
    },function(callback3){
      UserModel.update({_id:uid},{$pull:{history_like : mid}},function(err,docs){
        console.log('user의 history_like 빼기');
        callback3(null,docs);
      });
    }],function(err,result){
      if (err) {
        return callback(0,err.message);
      }
      callback(2,"좋아요 제거");
    });
  }
  });
};

exports.postComment = function(mid, uid, content,callback){
  ItemModel.update({_id:mid},{$push:{comments : {uid : uid, content : content}}},function(err,docs){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    if(docs.nModified == 0){
      return callback(0,"업데이트 실패");
    };
    callback(1,docs);
  });
};

exports.postReply = function(mid,id,uid,content,callback){
  ItemModel.update({_id:mid, "comments._id" : id},{$push: {"comments.$.reply" : {uid : uid, content : content}}},function(err,docs){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    if(docs.nModified == 0){
      return callback(0,"업데이트 실패");
    };
    callback(1,docs);
  });
};

exports.postCLike = function(mid,id,uid,callback){
  ItemModel.find({_id:mid, 'comments._id' : id},'-_id comments.$.likelist',function(err,docs){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    var likeList = docs[0].comments[0].likeList;   //특정 댓글의 likeList 추출
  if(likeList.indexOf(uid)== -1){  // 댓글을 좋아요한 목록에 없으면
    ItemModel.update({_id:mid, "comments._id" : id},{$push: {"comments.$.likeList" : uid}, $inc : {"comments.$.like" : 1}},function(err,docs){
      if(err){
        err.code = 500;
        return callback(0,err);
      }
      if(docs.nModified == 0){
        return callback(0,"업데이트 실패");
      };
      callback(1,"댓글 좋아요 완료");
    });
  }else{    //댓글을 좋아요한 목록에 있으면
    callback(2, "이미 좋아요를 눌렀습니다");
  }
});
};
