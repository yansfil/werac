var express = require('express');
var router = express.Router();

/* GET users listing. */

router.get('/', function(req, res, next) {
    console.log(req.session.id);
  res.render('index', { title: 'Express', userid : req.session.userid });
});
router.get('/login',function(req,res,next){

  res.render('loginform',{title : 'login'});
});
router.post('/login', function(req,res,next){
  console.log('req.body', req.body);
  var id = req.body.id;
  var pw = req.body.pw;
  if(id == 'hong' && pw == '1234'){
    req.session.userid = "hong";
    console.log('req.session.id = ', req.session.id);
    res.send('<script>alert("로그인완료ㅗㄹㅇ오오ㅗ오오옹오"); location.href="/";</script>');
  }else{
    res.send('<script>alert("뒤로돌아갑니다아아아아아아앙"); history.back();</script>');
  }
});
router.get('/logout', function(req,res,next){
  req.session.destroy(function(err){
    if(err) {
      console.log('err',err);
      next(err);
      return ;
    }
    res.send('<script>alert("로그아우수수우수웃우ㅜㅅ우숫"); location.href="/";</script>');
  })
});
module.exports = router;
