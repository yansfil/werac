var express = require('express');
var router = express.Router();
var db = require('../models/db');
var logger = require('../models/logger');
require('../models/model');
var queries = require('../models/queries');
var fs = require('fs');
var url = require('url');
var async = require('async');
var multer = require('multer');//image 저장하는 모듈 multer
var sizeOf = require('image-size'); //image 크기 알아보는 모듈
var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyCjtGpU0-erdsqTsJ5SSCooyxPpK8xau0M');


<!--전역변수 및 image처리 변수 선언하는 곳 -->


var profile_storage = multer.diskStorage({ //profile의 사진 저장소 정보
  destination: function (req, file, cb) {
    cb(null, './public/images/profile');
  },
  filename: function (req, file, cb) {
  	var tmp = file.mimetype; // 'image/jpeg', 'image/png', 'image/gif'
  	tmp = tmp.split('/')[1];
  	if(tmp == 'jpeg') { tmp = 'jpg' };
  	var ext = "." + tmp;
    cb(null, "real-" + Date.now() + ext);
  }
});
var item_storage = multer.diskStorage({ //item의 사진 저장소 정보
  destination: function (req, file, cb) {
    cb(null, './public/images/item');
  },
  filename: function (req, file, cb) {
  	var tmp = file.mimetype; // 'image/jpeg', 'image/png', 'image/gif'
  	tmp = tmp.split('/')[1];
  	if(tmp == 'jpeg') { tmp = 'jpg' };
  	var ext = "." + tmp;
    cb(null, "real-" + Date.now() + ext);
  }
});
var upload1 = multer({ storage: profile_storage}); //프로필 이미지에 대한 multer
var upload2 = multer({ storage: item_storage }); //모임 이미지에 대한 multer
var sessionId;
var UserModel = db.model('User');
var ItemModel = db.model('Item');


<!--router 실행부 -->
var ItemModel = db.model('Item');

router.post('/join', join); //회원가입하기
router.post('/login' , login); //로그인하기
router.post('/facebook-login',facebook_login); //페이스북 로그인
router.post('/logout', logout); //로그아웃하기
router.get('/users', showUsers); //유저 전체정보
router.get('/my_profile', showUser); //마이페이지 정보
router.get('/list/0', showLists);//홈화면 리스트
router.get('/list/1',showList1);// 진행단게 리스트들
router.get('/list/2', showList2); // 참가, 완료단계 리스트들
router.get('/listdetail/:mid', showListDetail); //mid에 따른 상세정보
router.get('/mc_profile/:uid', showMcProfile); //진행자에 대한 정보 보기
router.get('/creator_profile/:uid', showCreatorProfile); //개설자에 대한 정보 보기
router.get('/listdetail/:mid/guests', showGuestLists); //모임의 참여자들에 대한 정보 보기
router.get('/my_profile/alarm',showAlarm); //알림보기
router.post('/change/:mid', changeStatus); //제안 -> 참가상태 전환
router.post('/listdetail/:mid/like', addLike); //모임의 좋아요
router.post('/listDetail/:mid/comment', addComment); //댓글 달기
router.post('/listDetail/:mid/comment-edit', editComment); //댓글 수정
router.post('/listDetail/:mid/comment-delete', deleteComment); //댓글 삭제
router.post('/listDetail/:mid/reply', addReply); //댓글에 답글달기
router.post('/listDetail/:mid/clike', addCLike); //댓글에 좋아요하기
router.post('/participate/:mid', participate); //모임에 참여하기
router.post('/apply/:mid',applyMc); //진행자 지원하기 (alarm status 1)
router.post('/apply_result/:mid',resultMc); //진행자에게 지원결과 보내기 (alarm status 2)
router.post('/create', upload2.single('image'), saveItem); //모임 등록하기
router.post('/update/:mid', upload2.single('image'), updateItem); //모임 수정하기
router.post('/my_profile',upload1.single('profile_image'), updateUser); //프로필 수정하기


<!--각 route에 대한 function 선언하는 곳 -->

function join(req,res,next){
  var email = req.body.email;
  var pw = req.body.pw;
  var name = req.body.name;
  var phone = req.body.phone;
  var user = new UserModel({
    email : email,
    pw : pw,
    name : name,
    phone : phone
  });
  if(req.body.fb_id){   //fb 로그인일때
     user = new UserModel({
        fb_id : req.body.fb_id,
        name : req.body.name,
        phone : req.body.phone,
        gcm_token: req.body.gcmtoken
     });
     logger.info('fb_join ) fb_id : ', req.body.fb_id);
     queries.postJoin(user,function(type,docs){
         if(type==1){
             req.session.userid = docs._id;  //session에 uid 넣기
             sessionId = req.session.userid; //전역변수에 세션 값 넣기
             res.json({success: 1 , message : "OK", result : docs});
         }
         else res.json({success: 0 , message : "NO", result : docs});
       });
}
else{
  UserModel.findOne({email : email},function(err,docs){ //일반 사인업할때
    if(!docs){
      queries.postJoin(user,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: 0 , message : "NO", result : docs});
      });
    }else{
      res.json({success: 0, message : "NO", result : "email already exists" })
    }
  });
 }
}; //로그아웃하기


function login(req,res,next){
  var email = req.body.email;
  var pw = req.body.pw ;
  var gcm_token = req.body.gcmtoken;
  logger.warn('login ) user :' , email);
  queries.postLogin(email,pw,gcm_token,function(type,docs){
    if(type==1){
      req.session.userid = docs._id;  //session에 uid 넣기
      sessionId = req.session.userid; //전역변수에 세션 값 넣기
      if(sessionId){
        res.json({success: 1 , message : "OK", result : docs});
      }
    }
    else res.json({success: 0 , message : "NO"});
  });
}; //로그인하기

function facebook_login(req,res,next){
    var fb_token = req.body.access_token;
    var gcm_token= req.body.gcmtoken;
    var obj = new UserModel({
        fb_token : fb_token,
        gcm_token : gcm_token
    });
    queries.postfacebook(obj,function(type,docs){
        if(type==1){
          req.session.userid = docs._id;  //session에 uid 넣기
          logger.info(req.session.userid);
          sessionId = req.session.userid; //전역변수에 세션 값 넣기
          if(sessionId){
              logger.info('type 1번의 보내는 데이터 : ' , {success: 1 , message : "OK", result : docs});
            res.json({success: 1 , message : "OK", result : docs});
          }
      }else if(type==2){
          logger.info('type 2번의 보내는 데이터 : ' , {success: 2 , message : "OK", result : docs});
          res.json({success:2, message : "OK", result : docs});
      }else res.json({success: 0 , message : "NO"});
    });
};



function logout(req,res,next){
  sessionId = null //전역변수 user 초기화
  req.session.destroy(function(err){ //세션 지우기
      if(err) return res.json({success: 0 , message : "NO", result : "logout failed"});
      res.json({success: 1 , message : "OK", result : "logout!"});
  })
} //로그아웃하기

function showUsers(req, res, next){
  queries.getUsers(function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; //유저 전체정보

function showUser(req,res,next){
  var uid = req.session.userid;
  queries.getProfile('my',uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; // uid에 따른 유저정보

function showLists(req, res, next) {
  queries.getList(0,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  })
}; //전체모임 보기

function showList1(req, res, next) {
  queries.getList(1,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; //진행단계 모임 보기

function showList2(req, res, next) {
  queries.getList(2,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; // 참가, 완료단계 모임 보기

function showListDetail(req, res, next) {
  var mid = req.params.mid;
  queries.getDetailList(mid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs[0]});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; // mid에 따른 모임정보

function showMcProfile(req,res,next){
  var uid = req.params.uid;
  queries.getProfile('mc',uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs[0]});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; // uid에 따른 진행자 정보

function showCreatorProfile(req,res,next){
  var uid = req.params.uid;
  queries.getProfile('creator',uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs[0]});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; // uid에 따른 개설자 정보

function showGuestLists(req,res,next){
  var mid = req.params.mid;
  var uid = req.session.userid;
  queries.getGuestLists(mid, uid,function(type,docs){
    if(type== 0) res.json({success: 0 , message : "NO", result : docs});
    else res.json({success : 1 , messange : "yes" , result : docs});
  })
}; //mid에 따른 참여자들 정보

function showAlarm(req,res,next){
    var uid = req.session.userid;
    logger.info("알람보기");
    queries.getAlarmList(uid,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: 0 , message : "NO", result : docs});
    });
};

function addLike(req,res,next){
  var mid = req.params.mid;
  var uid = req.session.userid;
  queries.postLike(mid,uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else if(type==2) res.json({success: 2 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function saveItem(req,res,next){
  logger.info('saveItem ) req.body = ', req.body);
  logger.info('saveItem ) image로 저장될 url ',"http://52.79.178.195:3000/images/item/"+req.file.filename);
  async.waterfall([  //async로 size를 얻어온후 결과값을 post요청한다.
    function(callback){
      var imagePath ='public/images/item/'+req.file.filename; //이미지 실제path
      sizeOf(imagePath, function (err, dimensions) { //이미지 사이즈 측정후 넣기
        if(err){return next(err);}
        var image_size = [];
        image_size.push(dimensions.width);
        image_size.push(dimensions.height);
        callback(null,image_size);
      });
    },function(image_size,callback){
      var uid = req.session.userid;
      var has_mc = req.body.has_mc;
      var imagePath ='public/images/item/'+req.file.filename;
      var image = "http://52.79.178.195:3000/images/item/"+req.file.filename;
      var title  = req.body.title;
      var title_sub  = req.body.title_sub;
      var schedule = req.body.schedule;
      var location_detail = req.body.location_detail;
      var location_area = req.body.location_area;
      var date = req.body.date;
      var start_time = req.body.start_time;
      var end_time = req.body.end_time;
      var fee = req.body.fee;
      var limit_num = req.body.limit_num;
      var item = new ItemModel({
        creator : uid,
        has_mc : has_mc,
        image : image,
        image_size : image_size,
        title : title,
        title_sub : title_sub,
        schedule : schedule,
        location_detail : location_detail,
        location_area : location_area,
        date : date,
        start_time : start_time,
        end_time : end_time,
        fee : fee,
        limit_num : limit_num
      });
      if(has_mc=="false"){
          item.mc = uid;
      }
      callback(null,item);
    }
  ],function(err,item){
    queries.postItem(item, function(type,docs){
      if(type==1) res.json({success: 1 , message : "OK", result : docs});
      else res.json({success: 0 , message : "NO", result : docs});
    })
  });


};

function updateItem(req,res,next){
  var mid = req.params.mid;
  var uid = req.session.userid;
  var has_mc = req.body.has_mc;
  logger.info('updateItem) has_mc : ',has_mc);
  async.waterfall([
    function(callback){
      if(req.file){ //이미지파일을 변경했을 때
        var image = "http://52.79.178.195:3000/images/item/"+req.file.filename;
        var image_size = [];
        var imagePath ='public/images/item/'+req.file.filename; //이미지 실제path
        sizeOf(imagePath, function (err, dimensions) { //이미지 사이즈 측정 + 기존이미지 삭제
          if(err){return next(err);}
          image_size.push(dimensions.width);
          image_size.push(dimensions.height);
          logger.info('updateItem ) image_size :', image_size);
          logger.info("updateItem ) file : "+image);
          ItemModel.findOne({_id:mid},function(err,docs){
            if(err){return next(err);}
            else{
            var prevPath = 'public'+url.parse(docs.image).path; //이전 path
            fs.exists(prevPath, function (exists) { //기존이미지 삭제
              if(exists){
                fs.unlink(prevPath, function (err) {
                  if(err){return next(err);}
                  logger.info('updateItem ) image delete!');
                });
              }
            });
            }
          });
          callback(null,image,image_size);
        });
      }else{   //이미지파일은 그대로 일 때
        var image = req.body.image;
        logger.info("updateItem) url : "+image);
        callback(null,image,null);
      }
    },function(image,image_size,callback){
      logger.info("updateItem ) pass image_size??", image_size);
      var title  = req.body.title;
      var title_sub  = req.body.title_sub;
      var schedule = req.body.schedule;
      var location_detail = req.body.location_detail;
      var location_area = req.body.location_area;
      var date = req.body.date;
      var start_time = req.body.start_time;
      var end_time = req.body.end_time;
      var fee = req.body.fee;
      var limit_num = req.body.limit_num;
      var item = {
        _id : mid,
        has_mc : has_mc,
        image : image,
        image_size : image_size,
        title : title,
        title_sub : title_sub,
        schedule : schedule,
        location_detail : location_detail,
        location_area : location_area,
        date : date,
        start_time : start_time,
        end_time : end_time,
        fee : fee,
        limit_num : limit_num
      };
      if(!image_size){ //수정이 안됐을 때 image_size 처리
          item = {
          _id : mid,
          has_mc : has_mc,
          image : image,
          title : title,
          title_sub : title_sub,
          schedule : schedule,
          location_detail : location_detail,
          location_area : location_area,
          date : date,
          start_time : start_time,
          end_time : end_time,
          fee : fee,
          limit_num : limit_num
        };
      }
      callback(null,item);
    }
  ],function(err,item){
    queries.postUpdatedItem(mid,uid,item, function(type,docs){
      if(type==1){ res.json({success: 1 , message : "OK", result : docs});
    }
      else{
        res.json({success: 0 , message : "NO", result : docs});
      }
    })
  });
};

function addComment(req,res,next){
  var mid = req.params.mid;
  var content = req.query.content;
  var uid = req.session.userid;
  queries.postComment(mid,uid,content,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function editComment(req,res,next){
    var mid = req.params.mid;
    var uid = req.session.userid;
    var cid = req.body.cid;
    var content = req.query.content;
    queries.postEditedComment(mid,cid,uid,content,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: 0 , message : "NO", result : docs});
    });
};

function deleteComment(req,res,next){
    var mid = req.params.mid;
    var uid = req.session.userid;
    var cid = req.body.cid;
    queries.postDeleteComment(mid,cid,uid,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: 0 , message : "NO", result : docs});
    });
}

function addReply(req,res,next){
  var mid = req.params.mid;
  var cid = req.body.cid;
  var content = req.query.content;
  var uid = req.session.userid;
  queries.postReply(mid,cid,uid,content,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function addCLike(req,res,next){
  var mid = req.params.mid;
  var cid = req.body.cid;
  var uid = req.session.userid;
  queries.postCLike(mid,cid,uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else if(type==2) res.json({success: 2 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  })
};

function changeStatus(req,res,next){
  var mid = req.params.mid;
  var uid = req.session.userid;
  queries.getChangedStatus(mid,uid,function(type, docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function updateUser(req,res,next){
  var uid = req.session.userid;
  async.waterfall([
    function(callback){
      if(req.file){ //이미지파일을 변경했을 때
        var image = "http://52.79.178.195:3000/images/profile/"+req.file.filename;
        var imagePath ='public/images/profile/'+req.file.filename; //이미지 실제path
        logger.info("updateUser) file : "+image);
        UserModel.findOne({_id:uid},function(err,docs){
          if(err){return next(err);}
          else{
          var prevPath = 'public'+url.parse(docs.profile_image).path; //이전 path
          logger.info("updateUser) prevPath : ",prevPath);
          fs.exists(prevPath, function (exists) { //기존이미지 삭제
            if(exists){
              logger.info('updateUser ) exists : ',exists);
              fs.unlink(prevPath, function (err) {
                if(err){return next(err);}
              });
            }
          });
          }
        });
          callback(null,image);
        }else{   //이미지파일은 그대로 일 때
          var image = "";
          if(req.body.profile_image){
            image = req.body.profile_image;
          }
          callback(null,image);
        }
    },function(image,callback){
      var name = req.body.name;
      var comment = req.body.comment;
      var phone = req.body.phone;
      var user = {
        profile_image : image,
        name : name,
        comment : comment,
        phone : phone,
      };
      callback(null,user);
    }
  ],function(err,user){
    if(err) return next(err);
    queries.postUpdatedUser(uid,user, function(type,docs){
      if(type==1){ res.json({success: 1 , message : "OK", result : docs});
      }else{
        res.json({success: 0 , message : "NO", result : docs});
      }
    })
  });
};

function applyMc(req,res,next){
  var mid = req.params.mid;
  var uid = req.session.userid;

  queries.postApply(mid,uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function participate(req,res,next){
    var mid = req.params.mid;
    var uid = req.session.userid;
    queries.postParticipation(mid,uid,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: type , message : "NO", result : docs});
    })
}

function resultMc(req,res,next){
  var mid = req.params.mid;
  var creatorId = req.session.userid;
  var uid = req.body.uid;
  var result = req.body.result;
  queries.postApplyResult(mid,creatorId,uid,result,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  })
};

router.get('/user/:num',function(req,res,next){
  var num = parseInt(req.params.num);
  var user = new UserModel({
    email : "1234@werac.com",
    pw : "1234",
    name: "유저"+num,
    nickname: "닉네임"+num,
    comment: "코멘트"+num,
    phone: "01012345678",
    history_create : [num],
    history_join : [],
    history_mc : [],
    history_like : [],
    alarm : [
      {
			read : 0,
			status : 1,
			mid : 24,
			uid : 21,
			comment : "홍길동님이 서바이벌 모임에 진행자를 신청하였습니다. 프로필을 확인하시겠습니까?"
		  },
		  {
			read : 1,
			status : 2,
			mid  :28,
			accept : false,
			comment : "OO모임의 진행자로 탈락하였습니다"
		  },
		  {
			read : 1,
			status : 3,
			mid : 35,
			comment : "OO모임이 제안에서 참여단계로 전환되었습니다"
		  }
    ]
  });
  user.save({},function(err,docs){
    if(err) return next(err);
    res.json({success: 1 , message : "OK", result : docs});
  });
});

router.get('/item/:num',function(req,res,next){
  var num = parseInt(req.params.num);

  var item = new ItemModel({
    status : Math.ceil(Math.random()*3),
    uid : num,
    mc_id : Math.ceil(Math.random()*20),
    image : "",
    title : "타이틀"+ num,
    title_sub : "서브타이틀" + num,
    schedule : ["스케줄1","스케줄2","스케줄3"],
    location_detail : "위락호텔 20"+num+" 호" ,
    location_area : "서울시",
    date : "6월 17일",  //time은 date형으로 만들어야하나 더미용으로 String
    start_time : "13시",
    end_time : "19시",
    fee : 20000,
    limit_num : 5,
    guests_id : [Math.ceil(Math.random()*20), Math.ceil(Math.random()*20),num],
    like : Math.ceil(Math.random()*100),
    comments : [
      {
        uid : Math.ceil(Math.random()*20),
        content : "안녕!",
        reply : [
          {
            uid : Math.ceil(Math.random()*20),
            content : "그래 안녕~"
          }
        ]
      }
    ]
  });
  item.save({},function(err,docs){
    if(err) return next(err);
    res.json({success: 1 , message : "OK", result : docs});
  });
});


module.exports = router;
