var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var routes = require('./routes/index');
var users = require('./routes/users');
var socket = require('socket.io'); //채팅 테스트용
var session = require('express-session'); //session 테스트용
var http = require('http');
var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({    //세션기능을 추가해줄 때는 반드시 url router 위에다가 추가!!
  secret: 'keyboard cat',
  resave: true,
  // cookie: { maxAge: (60000 * 24 * 30)},
  saveUninitialized: false, //로그인을 쓰려면 false 복합기능 쓰려면 true
}));


app.use('/', routes);
app.use('/userss', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//채팅예제
// var server = require('http').Server(app);
// var io = require('socket.io')(server);
//
// var usernames = [];
// var socket_ids = [];
// var count = 0;
//
// io.sockets.on('connection', function (socket) {
// 	socket.on('sendmsg', function (data) {
// 		io.sockets.in(socket.room).emit('recvmsg', socket.username, data);
// 	});
//
// 	var claim = function (name) {
// 		if (!name || usernames[name]) {
// 			return false;
// 		} else {
// 		  usernames[name] = true;
// 		  return true;
// 		}
// 	};
//
//   // find the lowest unused "guest" name and claim it
//   var getGuestName = function () {
//     var name,
//       nextUserId = 1;
//     do {
//       name = '피티피플' + nextUserId;
//       nextUserId += 1;
//     } while (!claim(name));
//     return name;
//   };
//
// 	socket.on('guestjoin', function(roomname){
// 		var username = getGuestName();
//
// 		socket.username = username;
// 		socket.room = roomname;
// 		usernames[username] = username;
// 		socket.join(roomname);
// 		socket.emit('servernoti', 'green', '피티피플 채팅방에 참여하였습니다');
//
// 		var userlist = new Array();
//
// 		for (var name in usernames) {
// 			userlist.push(usernames[name]);
// 		}
//
// 		io.sockets.in(socket.room).emit('updateuser', userlist);
//     console.log(io.sockets.adapter.rooms['lobby']);
// 		socket.broadcast.to(roomname).emit('servernoti', 'green', username + ' has connected to ' + roomname);
// 		if (roomname!='lobby')
// 			socket.emit('updaterooms', rooms, roomname);
// 	});
//
// 	socket.on('disconnect', function(){
// 		delete usernames[socket.username];
// 		var userlist = new Array();
// 		for (var name in usernames) {
// 			userlist.push(usernames[name]);
// 		}
// 		io.sockets.emit('updateuser', userlist);
// 		socket.broadcast.emit('servernoti', 'red', socket.username + ' 나가셨습니다.');
// 		// socket.leave(socket.room);
// 	});
// });




app.listen(3000);

module.exports = app;
