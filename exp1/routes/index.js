var express = require('express');
var router = express.Router();
var db = require('../models/db');
require('../models/model');
var queries = require('../models/queries');
var UserModel = db.model('User');
var ItemModel = db.model('Item');

var multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images');
  },
  filename: function (req, file, cb) {
  	var tmp = file.mimetype; // 'image/jpeg', 'image/png', 'image/gif'
  	tmp = tmp.split('/')[1];
  	if(tmp == 'jpeg') { tmp = 'jpg' };
  	var ext = "." + tmp;
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});
var upload = multer({ storage: storage });


router.get('/users', showUsers);
router.get('/user/:uid', showUser);
router.get('/list/0', showLists);
router.get('/list/1',showList1);
router.get('/list/2', showList2);
router.get('/listdetail/:mid', showListDetail);
router.get('/mc_profile/:uid', showMcProfile);
router.get('/creator_profile/:uid', showCreatorProfile);
router.post('/upload1', upload.single('pic'), function(req, res, next) {
	console.log('req.body=', req.body);
	console.log('req.file=', req.file);
	res.json({result:'OK'});
});

function showUsers(req, res, next){
  queries.getUsers(function(docs){
    res.json({success: 1 , message : "OK", result : docs});
  });
}; //유저 전체정보

function showUser(req,res,next){
  var uid = req.params.uid;
  queries.getProfile('my',uid,function(docs){
    res.json({success: 1 , message : "OK", result : docs});
  });
}; // uid에 따른 유저정보

function showLists(req, res, next) {
  queries.getList(0,function(docs){
      res.json({success: 1 , message : "OK", result : docs});
  })
}; //전체모임 보기

function showList1(req, res, next) {
  queries.getList(1,function(docs){
      res.json({success: 1 , message : "OK", result : docs});
  });
}; //진행단계 모임 보기

function showList2(req, res, next) {
  queries.getList(2,function(docs){
      res.json({success: 1 , message : "OK", result : docs});
  });
}; // 참가, 완료단계 모임 보기

function showListDetail(req, res, next) {
  var mid = req.params.mid;
  queries.getDetailList(mid,function(docs){
    res.json({success: 1 , message : "OK", result : docs[0]});
  });
}; // mid에 따른 모임정보

function showMcProfile(req,res,next){
  var uid = req.params.uid;
  queries.getProfile('mc',uid,function(docs){
    res.json({success: 1 , message : "OK", result : docs[0]});
  });
}; // uid에 따른 진행자 정보

function showCreatorProfile(req,res,next){
  var uid = req.params.uid;
  queries.getProfile('creator',uid,function(docs){
    res.json({success: 1 , message : "OK", result : docs[0]});
  });
}; // uid에 따른 개설자 정보


router.get('/addcomment',function(req,res,next){
  ItemModel.update({mid:21, "comments._id" : 15},{$pull: {"comments.$.reply" : {uid : 13, content : "하이용"}}},function(err,docs){
      if(err) return next(err);
      res.json({success: 1 , message : "OK", result : docs[0]});
  });
});


// router.get('/user/:num',function(req,res,next){
//   var num = parseInt(req.params.num);
//   var user = new UserModel({
//     email : "1234@werac.com",
//     pw : "1234",
//     name: "유저"+num,
//     nickname: "닉네임"+num,
//     comment: "코멘트"+num,
//     phone: "01012345678",
//     history_create : [num],
//     history_join : [Math.ceil(Math.random()*20),Math.ceil(Math.random()*20)],
//     history_mc : [Math.ceil(Math.random()*20)],
//     history_like : [Math.ceil(Math.random()*20)],
//     alarm : [
//       {
// 			read : 0,
// 			status : 1,
// 			mid : 24,
// 			uid : 21,
// 			comment : "홍길동님이 서바이벌 모임에 진행자를 신청하였습니다. 프로필을 확인하시겠습니까?"
// 		  },
// 		  {
// 			read : 1,
// 			status : 2,
// 			mid  :28,
// 			accept : false,
// 			comment : "OO모임의 진행자로 탈락하였습니다"
// 		  },
// 		  {
// 			read : 1,
// 			status : 3,
// 			mid : 35,
// 			comment : "OO모임이 제안에서 참여단계로 전환되었습니다"
// 		  }
//     ]
//   });
//   user.save({},function(err,docs){
//     if(err) return next(err);
//     res.json({success: 1 , message : "OK", result : docs});
//   });
// });
//
/*router.get('/item/:num',function(req,res,next){
  var num = parseInt(req.params.num);

  var item = new ItemModel({
    status : Math.ceil(Math.random()*3),
    uid : num+2,
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
*/

module.exports = router;
