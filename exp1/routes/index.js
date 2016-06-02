var express = require('express');
var router = express.Router();
var db = require('../models/db');
require('../models/model');
var queries = require('../models/queries');
var formidable = require('formidable');
var fs = require('fs');
var url = require('url');
var async = require('async');
var multer = require('multer');//image 저장하는 모듈 multer
var sizeOf = require('image-size'); //image 크기 알아보는 모듈


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
    cb(null, './public/images');
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

var sessionId = null; //세션 userid의 전역변수
var UserModel = db.model('User');
var ItemModel = db.model('Item');



<!--router 실행부 -->

router.get('/',function(req,res,next){
  res.render('index', { title: 'Express', userid : req.session.userid });
});
router.post('/join', join); //회원가입하기
router.post('/login' , login); //로그인하기
router.post('/logout', logout); //로그아웃하기
router.get('/users', showUsers); //유저 전체정보
router.get('/my_profile/:uid', showUser); //마이페이지 정보
router.get('/list/0', showLists);//홈화면 리스트
router.get('/list/1',showList1);// 진행단게 리스트들
router.get('/list/2', showList2); // 참가, 완료단계 리스트들
router.get('/listdetail/:mid', showListDetail); //mid에 따른 상세정보
router.get('/mc_profile/:uid', showMcProfile); //진행자에 대한 정보 보기
router.get('/creator_profile/:uid', showCreatorProfile); //개설자에 대한 정보 보기
router.get('/listdetail/:mid/guests', showGuestLists); //모임의 참여자들에 대한 정보 보기
router.post('/listdetail/:mid/like/:uid', addLike); //모임의 좋아요
router.post('/listDetail/:mid/comment', addComment); //댓글 달기
router.post('/listDetail/:mid/reply/:id', addReply); //댓글에 답글달기
router.post('/listDetail/:mid/clike/:id', addCLike); //댓글에 좋아요하기
router.post('/create/:uid', upload2.single('image'), saveItem); //모임 등록하기
router.post('/update/:mid', upload2.single('image'), updateItem); //모임 수정하기
router.post('/upload1', upload2.single('pic'), function(req, res, next) {
	console.log('req.body=', req.body);
	console.log('req.file=', req.file);
	res.json({result:'OK'});
});

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
  UserModel.findOne({email : email},function(err,docs){
    if(!docs){
      queries.postJoin(user,function(type,docs){
        if(type==1) res.json({success: 1 , message : "OK", result : docs});
        else res.json({success: 0 , message : "NO", result : docs});
      });
    }else{
      res.json({success: 0, message : "NO", result : "email already exists" })
    }
  });
}; //로그아웃하기

function login(req,res,next){
  var email = req.body.email;
  var pw = req.body.pw ;
  queries.postLogin(email,pw,function(type,docs){
    if(type==1){
      req.session.userid = docs._id;  //session에 uid 넣기
      sessionId = req.session.userid; //전역변수에 세션 값 넣기
      if(sessionId){
        res.json({success: 1 , message : "OK", result : docs});
      }
    }
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; //로그인하기

function logout(req,res,next){
  sessionId = null //전역변수 user 초기화
  req.session.destroy(function(err){ //세션 지우기
    if(err) return res.json({success: 0 , message : "NO", result : "logout failed"});
    res.json({success: 1 , message : "OK", result : "logout!"});
  })
}


function showUsers(req, res, next){
  queries.getUsers(function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
}; //유저 전체정보

function showUser(req,res,next){
  var uid = req.params.uid;
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
  queries.getGuestLists(mid, function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  })
}; //mid에 따른 참여자들 정보

function addLike(req,res,next){
  var mid = req.params.mid;
  var uid = req.params.uid;
  queries.postLike(mid,uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else if(type==2) res.json({success: 2 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function saveItem(req,res,next){
  console.log('req.body = ', req.body);
  console.log(req.file);
  console.log('image로 저장될 url ',"http://52.79.178.195:3000/images/"+req.file.filename);
  async.waterfall([  //async로 size를 얻어온후 결과값을 post요청한다.
    function(callback){
      var imagePath ='public/images/'+req.file.filename; //이미지 실제path
      sizeOf(imagePath, function (err, dimensions) { //이미지 사이즈 측정후 넣기
        if(err){return next(err);}
        var image_size = [];
        image_size.push(dimensions.width);
        image_size.push(dimensions.height);
        callback(null,image_size);
      });
    },function(image_size,callback){

      var uid = req.params.uid;
      var has_mc = req.body.has_mc;
      var imagePath ='public/images/'+req.file.filename;
      var image = "http://52.79.178.195:3000/images/"+req.file.filename;
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
        uid : uid,
        has_mc : has_mc,
        image : image,
        image_size : image_size,
        title : title,
        title_sub : title_sub,
        schedule : schedule,
        location_detail : location_detail,
        location_area : location_detail,
        date : date,
        start_time : start_time,
        end_time : end_time,
        fee : fee,
        limit_num : limit_num
      });
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
  var has_mc = req.body.has_mc;
  async.waterfall([
    function(callback){
      if(req.file){ //이미지파일을 변경했을 때
        var image = "http://52.79.178.195:3000/images/"+req.file.filename;
        var image_size = [];
        var imagePath ='public/images/'+req.file.filename; //이미지 실제path
        sizeOf(imagePath, function (err, dimensions) { //이미지 사이즈 측정 + 기존이미지 삭제
          if(err){return next(err);}
          image_size.push(dimensions.width);
          image_size.push(dimensions.height);
          console.log('image_size :', image_size);
          console.log("file : "+image);
          ItemModel.findOne({_id:mid},function(err,docs){
            if(err){return next(err);}
            else{
            var prevPath = 'public'+url.parse(docs.image).path; //이전 path
            fs.exists(prevPath, function (exists) { //기존이미지 삭제
              if(exists){
                fs.unlink(prevPath, function (err) {
                  if(err){return next(err);}
                  console.log('image delete!');
                });
              }
            });
            }
          });
          callback(null,image,image_size);
        });
      }else{   //이미지파일은 그대로 일 때
        var image = req.body.image;
        console.log("url : "+image);
        callback(null,image,null);
      }
    },function(image,image_size,callback){
      console.log("pass image_size??", image_size);
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
        location_area : location_detail,
        date : date,
        start_time : start_time,
        end_time : end_time,
        fee : fee,
        limit_num : limit_num
      };
      if(!image_size){ //수정이 안됐을 때 image_size 처리
        var item = {
          _id : mid,
          has_mc : has_mc,
          image : image,
          title : title,
          title_sub : title_sub,
          schedule : schedule,
          location_detail : location_detail,
          location_area : location_detail,
          date : date,
          start_time : start_time,
          end_time : end_time,
          fee : fee,
          limit_num : limit_num
        };
        console.log(item);
      }
      callback(null,item);
    }
  ],function(err,item){
    queries.postUpdatedItem(mid,item, function(type,docs){
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
  var uid = req.query.uid;
  queries.postComment(mid,uid,content,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function addReply(req,res,next){
  var mid = req.params.mid;
  var id = req.params.id;
  var content = req.query.content;
  var uid = req.query.uid;
  queries.postReply(mid,id,uid,content,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else res.json({success: 0 , message : "NO", result : docs});
  });
};

function addCLike(req,res,next){
  var mid = req.params.mid;
  var id = req.params.id;
  var uid = req.query.uid;
  queries.postCLike(mid,id,uid,function(type,docs){
    if(type==1) res.json({success: 1 , message : "OK", result : docs});
    else if(type==2) res.json({success: 2 , message : "OK", result : docs});
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
    history_join : [Math.ceil(Math.random()*20),Math.ceil(Math.random()*20)],
    history_mc : [Math.ceil(Math.random()*20)],
    history_like : [Math.ceil(Math.random()*20)],
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


module.exports = router;
