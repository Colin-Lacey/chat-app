var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var moment = require('moment') ;
const users = [];
const messages = [];
var userIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  users.push('User' + userIndex) ;
  socket.nickname = users[userIndex] ;
  userIndex = userIndex + 1;
  socket.emit('message history', messages);
  io.emit('update user list', users);
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
      const temp = msg.substring(0,5)
      if (temp === '/nick') {
        var newNick = msg.substring(6) ;
        if (!(users.includes(newNick))) {
          users.push(newNick) ;
          socket.nickname = newNick ;
        } else {
          let current_time = moment().format("HH:mm");
          io.emit('chat message', current_time + ' ' + socket.nickname + ': ' + msg ) ;
          io.emit('chat message', 'Sorry ' + socket.nickname + ', that nickname already exits!') ;
          messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
          messages.push('Sorry ' + socket.nickname + ', that nickname already exits!');
          return;
        }
      }
      let current_time = moment().format("HH:mm");
      io.emit('chat message', current_time + ' ' + socket.nickname + ': ' + msg ) ;
      messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
    });
    socket.on('disconnect', function () {
      let current_time = moment().format("HH:mm");
      io.emit('user disconnect', current_time+ ' ' + socket.nickname);
    });
});

io.on('connection', function(socket) {
  socket.on('send-nickname', function(nickname) {
    socket.nickname = nickname;
    users.push(socket.nickname);
    console.log(users);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});