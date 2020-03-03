var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var moment = require('moment') ;
let users = [];
const messages = [];
var userIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  users.push('User' + userIndex) ;
  socket.nickname = users[userIndex] ;
  socket.rgb = '#000000';
  socket.index = userIndex;
  userIndex = userIndex + 1;
  socket.emit('message history', messages);
  io.emit('update user list', users);
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg, rgbColor){
      const rgbCheck = msg.substring(0,4);
      const nickCheck = msg.substring(0,5);
      if (rgbCheck === '/rgb') {
        let regex = new RegExp('^(?:[A-Fa-f0-9]{6})$');
        let newRGB = msg.substring(5);
        let validRGB = regex.test(newRGB);
        console.log(validRGB);
        if (validRGB) {
          socket.rgb = '#'+newRGB;
        }
      }
      if (nickCheck === '/nick') {
        var newNick = msg.substring(6) ;
        if (!(users.includes(newNick))) {
          users[socket.index] = newNick;
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
      // sending to the client
      socket.emit('chat message', current_time + ' ' + socket.nickname + ': ' + msg, socket.rgb, true);
      // sending to all clients except sender
      socket.broadcast.emit('chat message', current_time + ' ' + socket.nickname + ': ' + msg, socket.rgb, false);
      //io.emit('chat message', current_time + ' ' + socket.nickname + ': ' + msg, socket.rgb, socket.nickname) ;
      messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
      io.emit('update user list', users);
    });
    socket.on('disconnect', function () {
      console.log('got disconnect ' + socket.nickname);
      delete users[socket.index];
      io.emit('update user list', users);

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