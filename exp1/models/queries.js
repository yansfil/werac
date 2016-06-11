require('../models/model')
var db = require('../models/db');
var moment = require('moment');
var UserModel = db.model('User');
var ItemModel = db.model('Item');
var counterModel = db.model('counter');
var async = require('async');
var crypto = require('crypto');  //패스워드 암호화 과정
var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyCjtGpU0-erdsqTsJ5SSCooyxPpK8xau0M');
// decipher.update(cipherd, 'hex', 'ascii');
// var decipherd = decipher.final('ascii');

exports.postJoin = function(user,callback){
  var cipher = crypto.createCipher('aes256','password');
  cipher.update(user.pw); //pw 암호화과정
  user.pw = cipher.final('hex');
  counterModel.findOneAndUpdate({_id:'userId'},{$inc: {seq : 1}},{upsert:true, new:true},function(err,pre_doc){
      user._id = pre_doc.seq;
      user.save(function(err,docs){
        if(err) return callback(0,err);
        callback(1, docs);
      })
  });
};

exports.postLogin = function(email, pw,gcm_token,callback){
  var cipher = crypto.createCipher('aes256','password');
  cipher.update(pw); //pw 암호화과정
  pw = cipher.final('hex');
  UserModel.findOneAndUpdate({email:email, pw: pw},{$set:{gcm_token:gcm_token}},{new : true},function(err,docs){
    if(docs){
      console.log('됏다시');
      docs.history_mc = undefined;
      docs.history_like = undefined;
      docs.history_join = undefined;
      docs.history_create = undefined;
      console.log("docs ? :" , docs.history_create);
      callback(1,docs);
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
      ItemModel.find({},'_id status image image_size title title_sub mc location_area date start_date like has_mc').sort({reg_date : -1}).
      populate({
        path : 'mc',
        select : '_id'
      }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
    });
      break;
    case 1:
      ItemModel.find({status: 1},'_id status image image_size title title_sub mc location_area date start_date like has_mc').sort({reg_date:-1}).
      populate({
        path : 'mc',
        select : '_id'
        }).exec(function(err,docs){
        if(err){
          err.code =500;
          return callback(0,err);
        }
        callback(1,docs);
      });
      break;
    case 2:
      ItemModel.find({status: {$ne : 1}},'_id status title image image_size mc title_sub location_area date start_date like has_mc').sort({reg_date:-1}).
      populate({
        path : 'mc',
        select : '_id'
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

exports.getDetailList = function(mid,callback){
  ItemModel.find({_id : mid }).populate({
    path : 'creator mc guests comments.user comments.reply.user',
    select : '_id profile_image name'
  }).exec(function(err,docs){
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
        path : 'history_create mc history_join history_like history_mc history_create.mc ',
        select : '_id status image image_size mc title title_sub location_area date start_date like has_mc',
        populate : {path : "mc", select : "_id"}
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
        select : 'status image image_size title mc title_sub location_area date start_date like has_mc',
        populate : {path : "mc", select : "_id"}
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
        path : 'history_create mc history_join history_like history_mc',
        select : 'status image image_size title  mc title_sub location_area date start_date like has_mc',
        populate : {path : "mc", select : "_id"}
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

exports.getGuestLists = function(mid, uid,callback){
  ItemModel.find({_id:mid, creator : uid},'-_id guests').populate({
    path : 'guests',
    select : 'profile_image name phone'
  }).exec(function(err,docs){
    if(err){
      err.code = 500;
      return callback(0,err);
    }
    callback(1,docs[0]);
  });
};

exports.getAlarmList = function(uid,callback){
    UserModel.findOne({_id:uid},'-_id alarm').sort({"alarm.$.date":-1}).exec(function(err,docs){
        if(err) return callback(0,err);
            docs.alarm.sort(function(a,b){ //날짜순 정렬
                var keyA = new Date(a.date);
                var keyB = new Date(b.date);
                if(keyA < keyB) return 1;
                if(keyA > keyB) return -1;
                return 0;
            });
            callback(1,docs.alarm);
    });
}

exports.postItem = function(item,callback){
  counterModel.findOneAndUpdate({_id:'itemId'},{$inc: {seq : 1}},{upsert:true, new:true},function(err,pre_doc){
      item._id = pre_doc.seq;
      console.log('pre_cod의 id :', pre_doc.seq );
      item.save(function(err,docs1){
        if(err){
          err.code = 500;
          return callback(0,err);
        }
        UserModel.update({_id : item.creator}, {$push: {history_create : docs1._id }},function(err,docs2){
          if(err){
            err.code = 500;
            return callback(0,err);
          }
            callback(1,docs1);
        })
      });
  });
};

exports.postUpdatedItem = function(mid, uid, item, callback){
  async.series([
    function(callback1){
      if(item.has_mc){ //has_mc 있으면 mc unset
            console.log("has_mc가 true일때");
          ItemModel.findOne({_id:mid, creator:uid, status : 1, has_mc:true, mc:{$exists:true}},function(err,docs){
            if(docs){ //has_mc 가 true 이며 mc는 존재한다 . 즉 진행자를 뽑은 상태
                console.log("MCMCMC잇어염잇어염");
                ItemModel.update({_id:mid, creator:uid, status:1},{$set:item},function(err,docs1){
                  if(err){
                    err.code = 500;
                    return callback1(err);
                  }
                  console.log(docs1);
                  callback1(null);
                });
            }else{
                ItemModel.update({_id:mid, creator:uid, status:1},{$set:item,$unset:{mc:""}},function(err,docs1){
                  if(err){
                    err.code = 500;
                    return callback1(err);
                  }
                  console.log(docs1);
                  callback1(null);
                });
                console.log("MC없어염");
            }
          });

      }else{ //없으면 mc 냅두고
          console.log("has_mc가 false일때");
          item.mc = uid;
          ItemModel.update({_id:mid, creator:uid, status:1},{$set:item},function(err,docs1){
            if(err){
              err.code = 500;
              return callback1(err);
              console.log('안되냐');
            }
            console.log(docs1);
            callback1(null);
          });
        }
    },function(callback1){
      ItemModel.findOne({_id:mid},function(err,docs2){  //update로는 결과값을 볼 수 없다.
        callback1(null,docs2);
      })
    }
  ],function(err,result){
    if(err) return callback(0,err.message);
    callback(1,result[1]);
  });
};

exports.postUpdatedUser = function(uid, user, callback){
  async.series([
    function(callback1){
      UserModel.update({_id:uid},{$set:user},function(err,docs1){
        if(err){
          err.code = 500;
          return callback1(err);
        }
        callback1(null);
      });
    },function(callback1){
      UserModel.findOne({_id:uid},function(err,docs2){
        callback1(null,docs2);
      })
    }
  ],function(err,result){
    if(err) return callback(0,err.message);
    callback(1,result[1]);
  });
};

exports.getChangedStatus = function(mid,uid, callback){ //상태변경될때
  ItemModel.find({_id : mid, creator : uid}, function(err,docs1){
    if(err) return callback(0,err);
    var likeList = docs1[0].likeList;
    var status = docs1[0].status;
    var title = docs1[0].title;
    var comment = title + " 모임의 단계가 진행단계에서 참가단계로 변경되었습니다."
    if(docs1.length == 0){
      callback(0,"no access allowed");
    }else{
      if(status ==1 ){
          ItemModel.update({_id:mid},{$set:{status : 2}},function(err,docs2){
            if(err) return callback(0,err);
            console.log('likeList : ', likeList);
            if(likeList.length > 0){
                UserModel.find({_id:{$in:likeList}},function(err,docs){
                    if(err) return callback(0,err);
                    docs.forEach(function(item,index){
                        gcm_push(comment,item.gcm_token);
                        console.log(index);
                    });
                    UserModel.update({_id: {$in: likeList}},{$push : {alarm:{"status":3, "mid":mid, "comment":comment}}},function(err,docs){ //알림 status 3번 넣기
                        if(err) return callback(0,err);
                        callback(1,docs2);
                    });
                });
            }
        });
     }else if(status ==2){
        ItemModel.update({_id:mid},{$set:{status:3}},function(err,docs2){
            if(err) return callback(0,err);
            callback(1,docs2);
        });
    }else{
        callback(0,'상태전환 불가');
    }
    }
  })

}

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
      ItemModel.update({_id:mid},{$inc:{like : 1},$push:{likeList:uid}},function(err,docs){
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
      callback(1,{result:"좋아요 추가",status:1});
    });
  }else{  // 유저의 좋아요 목록에 있다면
    async.series([
    function(callback3){
    ItemModel.update({_id:mid},{$inc:{like : -1},$pull:{likeList:uid}},function(err,docs){
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
      callback(1,{result:"좋아요 제거",status:0});
    });
  }
  });
};

exports.postComment = function(mid, uid, content,callback){
  ItemModel.findOneAndUpdate({_id:mid},{$push:{comments : {user : uid, content : content}}},{new : true } ,function(err,docs){
    if(err){
      err.code = 500;
      console.log(err.message);
      return callback(0,err);
    }
    if(docs.nModified == 0){
      return callback(0,"업데이트 실패");
    };

    var length = docs.comments.length;
    var comment = docs.comments[length-1];
    var result = {
        _id : comment._id,
        content : comment.content,
        likeList : comment.likeList
    };
    callback(1,result);
    console.log('results : ',JSON.stringify(result, null, 4));
  });
};

exports.postEditedComment = function(mid,cid,uid,content,callback){
    ItemModel.update({_id:mid, "comments._id" : cid, "comments.user" : uid},{$set:{"comments.$.content" : content}},function(err,docs){
        if(err){
            console.log(err.message);
            return callback(0,err);
        }
        callback(1,docs);
    });
}

exports.postDeleteComment = function(mid,cid,uid,callback){
    ItemModel.update({_id:mid}, {$pull:{comments : {_id : cid}}},{multi:false},function(err,docs){
        console.log('mid :' , mid);
        console.log('cid :' , cid);
        console.log('uid :' , uid);
        if(err){
          err.code = 500;
          console.log(err.message);
          return callback(0,err);
        }
        if(docs.nModified == 0){

          return callback(0,"업데이트 실패");
        };
        callback(1,docs);
      });
}

exports.postReply = function(mid,cid,uid,content,callback){
  ItemModel.update({_id:mid, "comments._id" : cid},{$push: {"comments.$.reply" : {user : uid, content : content}}},function(err,docs){
    if(err){
      err.code = 500;
      console.log(err.message);
      return callback(0,err);
    }
    if(docs.nModified == 0){
      return callback(0,"업데이트 실패");
    };
    callback(1,docs);
  });
};

exports.postCLike = function(mid,cid,uid,callback){
  ItemModel.find({_id:mid, 'comments._id' : cid},'-_id comments.$.likeList',function(err,docs){
    if(err){
      err.code = 500;
      console.log(err.message);
      return callback(0,err);
    }
    var likeList = docs[0].comments[0].likeList;   //특정 댓글의 likeList 추출
  if(likeList.indexOf(uid)== -1){  // 댓글을 좋아요한 목록에 없으면
    ItemModel.update({_id:mid, "comments._id" : cid},{$push: {"comments.$.likeList" : uid}, $inc : {"comments.$.like" : 1}},function(err,docs){
      if(err){
        err.code = 500;
        return callback(0,err);
      }
      if(docs.nModified == 0){
        return callback(0,"업데이트 실패");
      };
      callback(1,{result: "댓글 좋아요 완료", status:1});
    });
  }else{    //댓글을 좋아요한 목록에 있으면
    callback(1,{result:"이미 좋아요를 눌렀습니다", status:0});
  }
  });
};

exports.postApply = function(mid,uid,callback){
  ItemModel.findOne({_id:mid, has_mc:true},'creator title',function(err,docs){
    if(err){
        return callback(0,err);
        console.log(err.message);
    }
    var creator_id = docs.creator;
    console.log('creator_id : ',creator_id);
    console.log('uid : ',uid);
    console.log('mid : ',mid);
    var title = docs.title;
    var comment = title + " 모임에 진행자 신청이 들어왔습니다. 프로필을 확인해보세요."
    console.log('comment : ', comment);
    UserModel.findOne({_id:creator_id,alarm:{$elemMatch:{status:1, mid:mid, uid:uid}}},function(err,docs2){ //알림 중복을 방지하기 위해 사전에 find로 가름
        if(err) return callback(0, err);
        console.log(docs2);
        if(!docs2){
            UserModel.findOneAndUpdate({_id:creator_id},{$push:{alarm:{"status":1, "mid":mid, "uid":uid,"comment":comment}}},{upsert:true},function(err,docs){
              if(err) return callback(0, err);
                  console.log('최종접근 완료.');
                  var gcm_token = [docs.gcm_token];
                  gcm_push(comment,gcm_token);
                  ItemModel.update({_id:mid},{$push:{apply_mc_result:uid}},function(err,docs){
                      if(err) return callback(0, err);
                      callback(1,docs);
                  });
            }); //알람은 중복방지 필요
        }else{
            console.log('최종접근 실패');
          callback(0,"이미있어");
        }
    });
  });
};

exports.postParticipation = function(mid,uid, callback){
        ItemModel.findOneAndUpdate({_id:mid, status : 2, $where:'this.guests.length<this.limit_num'},{$addToSet:{guests: uid}},function(err,docs){
            if(err) return callback(0, err);
            if(!docs){
              callback(2,"참여정원 꽉참");
              console.log('참여정원 꽉참');
            }else{
                var full = 0;
              docs.guests.forEach(function(item){
                  if(item == uid){
                      full = 1;
                  }
              });
              if(full){
                  callback(3,"이미있다");
                  console.log('이미참여함');
              }else{
                  callback(1,"성공");
                  console.log('성공');
              }
            }
    })
};

//진행자 신청 결과 전송

exports.postApplyResult = function(mid,creatorId,uid,result,callback){
    var comment1 = '';
    var comment2 = '';
    var title="";
    var applyList = [];
    console.log('첫 접근 완료?');
    if(!creatorId){
        return callback(0, "해킹시도해킹시도");
        console.log('session이 없이 접근되었습니다');
    }
    async.waterfall([
      function(callback1){ //초기 Item의 mc넣기
         console.log('1단계 waterfall');
         ItemModel.find({_id:mid, creator : creatorId, has_mc : true}).exists('mc',true).exec(function(err,result){
             if(err) {return callback1(err);}
              if(result.length){
               console.log('MC값 이미 존재');
                 return callback(0, '취소')
             }else{
                 console.log('테스트트트트ㅡ');
                 ItemModel.findOneAndUpdate({_id:mid, creator : creatorId},{$set:{mc:uid}},function(err,docs){
                    if(err) return callback1(err);

                     title = docs.title;
                     comment1 = title + " 모임의 진행자로 선정되었습니다"
                     comment2 = title + " 모임의 진행자 신청에 떨어졌습니다"
                     applyList = docs.apply_mc_result;
                     console.log('apply List size:' , applyList.length);
                     callback1(null,comment1,comment2);
                  });
             }
         })
    },function(comment1,comment2,callback1){   //선정된 유저에게 메세지보내기
         console.log('2단계 waterfall');
        UserModel.findOne({_id:uid, alarm:{$elemMatch:{status:2, mid: mid}}},function(err,docs){ //중복 방지
            if(err) return callback(0, err);
            if(!docs){
                UserModel.findOneAndUpdate({_id: uid},{$push:{alarm:{"status":2, "mid":mid,"comment" : comment1}, history_mc:mid}},function(err,docs){
                    if(err) return callback1(err);
                    var gcm_token = [];
                    gcm_token.push(docs.gcm_token);
                    console.log('gcm Id :',docs.gcm_token);
                    gcm_push(comment1,gcm_token);
                    callback1(null,comment2);
                    console.log('선정된 유저 메세지 전송 완료');
                });
            }else{
                console.log('이미 선정하였습니다.')
                callback(0,"이미 보냈습니다.")
            }
        });
    },function(comment2,callback3){ //탈락한 유저에게 메세지 보내기
         console.log('3단계 waterfall');
        UserModel.findOne({_id:{$in:applyList}, alarm:{$elemMatch:{status:2, mid:mid}}},function(err,docs){ //중복 방지
                console.log('탈락한 유저에게 메세지 보내기 성공')
                var gcm_tokens = [];
                applyList.splice(applyList.indexOf(uid),1); //선정된 유저는 applyList에서 제외
                console.log('applyList 오류아님');
                if(applyList.length){
                    UserModel.find({_id:{$in:applyList}}).exec(function(err,docs){
                        docs.forEach(function(item){
                            gcm_tokens.push(item.gcm_token);
                        });
                        UserModel.update({_id:{$in:applyList}},{$push:{alarm:{"status":2, "mid":mid,"comment" : comment2}, history_mc:mid}},function(err,docs){
                            if(err) return callback1(err);
                            gcm_push(comment2,gcm_tokens);
                            console.log("되었다");
                            callback3(null, "최종완료");
                        });
                    });
                }else{
                    console.log("1명만이 지원하였다");
                    callback3(null, "최종완료");
                }
        });
    }
],function(err,result){ //status 4로 전환하기!
      if(err) return callback(0, err);
    //   UserModel.findOne({_id:creatorId, alarm:{$elemMatch:{status:1, mid:mid}}},function(err,doc){
    //         if(err) return callback(0,err);
    //         if(!doc){
    //             return callback(0,"status 이미 변경");
    //         }
    //         doc.alarm.forEach(function(item){
    //             if(item.status == 1 && item.mid == mid){
    //                 item.status = 4;
    //             }
    //         });
    //         doc.save(function(err,doc){
    //             callback(1,result);
    //             console.log(result);
    //         })
    //  });
 });
}

var gcm_push = function(message,registrationIds){
    var sendmessage = new gcm.Message({
        delayWhileIdle: true,
        timeToLive: 3,
         data:{
             title: 'werac',
             message: message,
            sender:"관리자"
        }
      });
      console.log('message : ',sendmessage);
    //   var registrationIds=["e-ye7omycKo:APA91bEsf_BB9KrvOa2cb69EVmG_aBv-tRovAWu0uQmyqfCTHIHNrg83QwtA6K-MoXTvh7goNcKxG6CI5SUSp_pQNswBwXC-477pkIUFjLH6fxChYY4mJwn3JrgWMI7DjyPcEXaKOw-K"];
      sender.send(sendmessage,registrationIds,4,function(err,response){
         if(err){console.log(err);callback(err);}
         else console.log(response);
     });
};
