var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var moment = require('moment') ;
const users = new Set();
const messages = [];
var userIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.emit('checkIfNewUser');
  socket.on('confirmIfNewUser', function(isNewUser){
    if (isNewUser) {
      users.add('User' + userIndex) ;
      socket.nickname = ('User' + userIndex) ;
      socket.rgb = '#DCDDDE';
      socket.emit('setCookies',socket.nickname,socket.rgb);
      userIndex = userIndex + 1;
      console.log(socket.nickname);
      socket.emit('update user header',socket.nickname, socket.rgb);
    } else {
      socket.emit('getCookies')
      socket.on('returnCookies', function(user,rgb){
        users.add(user) ;
        socket.nickname = user ;
        socket.rgb = rgb;
        let msgUsers = Array.from(users);
        io.emit('update user list', msgUsers);
        socket.emit('update user header',socket.nickname, socket.rgb);
      });
    }
  });
  
  socket.emit('message history', messages);
  let msgUsers = Array.from(users);
  io.emit('update user list', msgUsers);
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg, rgbColor){
      const rgbCheck = msg.substring(0,4);
      const nickCheck = msg.substring(0,5);
      if (rgbCheck === '/rgb') {
        let regex = new RegExp('^(?:[A-Fa-f0-9]{6})$');
        let newRGB = msg.substring(5);
        let validRGB = regex.test(newRGB);
        if (validRGB) {
          socket.rgb = '#'+newRGB;
          socket.emit('setCookies',socket.nickname,socket.rgb);
          socket.emit('update user header',socket.nickname, socket.rgb);
        } else {
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          socket.emit('admin message', 'Sorry ' + socket.nickname + ', invalid rgb value!')
          return;
        }
      }
      if (nickCheck === '/nick') {
        var newNick = msg.substring(6) ;
        if (newNick.length > 15){
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
          messages.push('Sorry ' + socket.nickname + ', nickname must be 15 characters or less!');
          io.emit('admin message', 'Sorry ' + socket.nickname + ', nickname must be 15 characters or less!') ;
          return;
        }
        if (!(users.has(newNick))) {
          users.delete(socket.nickname);
          socket.nickname = newNick;
          users.add(socket.nickname);
          let msgUsers = Array.from(users);
          io.emit('update user list', msgUsers);
          socket.emit('setCookies',socket.nickname,socket.rgb);
          socket.emit('update user header',socket.nickname, socket.rgb);
        } else {
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          io.emit('admin message', 'Sorry ' + socket.nickname + ', that nickname already exits!') ;
          messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
          messages.push('Sorry ' + socket.nickname + ', that nickname already exits!');
          return;
        }
      } else if (msg[0] === '/' && rgbCheck != '/rgb') {
        let current_time = moment().format("HH:mm");
        socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
        socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
        messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
        io.emit('admin message', 'Unrecognized command. Accepted commands: /nick , /rgb');
        messages.push('Unrecognized command. Accepted commands: /nick , /rgb');
        return;
      }
      let current_time = moment().format("HH:mm");
      socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
      socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
      messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
      console.log(users);
    });
    socket.on('disconnect', function () {
      users.delete(socket.nickname);
      let msgUsers = Array.from(users);
      io.emit('update user list', msgUsers);
    });
});

io.on('connection', function(socket) {
  socket.on('send-nickname', function(nickname) {
    users.delete(socket.nickname);
    socket.nickname = nickname;
    users.add(socket.nickname);
    let msgUsers = Array.from(users);
    io.emit('update user list', msgUsers);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});