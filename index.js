var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var moment = require('moment') ;
const users = new Set();
const messages = [];
let userIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
// dealing with a new connection
io.on('connection', function(socket){
  // ask the client to check cookies to see if the user already exists
  socket.emit('checkIfNewUser');
  socket.on('confirmIfNewUser', function(isNewUser){
    // if they had no cookies, assign them a default username and add them to the set of users
    if (isNewUser) {
      users.add('User' + userIndex) ;
      socket.nickname = ('User' + userIndex) ;
      socket.rgb = '#DCDDDE';
      socket.emit('setCookies',socket.nickname,socket.rgb);
      userIndex = userIndex + 1;
      console.log(socket.nickname);
      socket.emit('update user header',socket.nickname, socket.rgb);
      let msgUsers = Array.from(users);
      io.emit('update user list', msgUsers);
    } else {
      socket.emit('getCookies')
      socket.on('returnCookies', function(user,rgb){
        // give the user their old nickname if it hasn't been taken
        // otherwise, assign a new nickname as if they were new
        if (!(users.has(user))) {
          users.add(user) ;
          socket.nickname = user ;
          socket.rgb = rgb;
          let msgUsers = Array.from(users);
          io.emit('update user list', msgUsers);
          socket.emit('update user header',socket.nickname, socket.rgb);
        } else {
          users.add('User' + userIndex) ;
          socket.nickname = ('User' + userIndex) ;
          socket.rgb = '#DCDDDE';
          socket.emit('setCookies',socket.nickname,socket.rgb);
          userIndex = userIndex + 1;
          socket.emit('update user header',socket.nickname, socket.rgb);
        }
      });
    }
  });
  // send stored messages to the client for display, and update the client's user list
  socket.emit('message history', messages);
  let msgUsers = Array.from(users);
  io.emit('update user list', msgUsers);
});

io.on('connection', function(socket){
    // code for dealing with messages sent from a client
    socket.on('chat message', function(msg, rgbColor){
      const rgbCheck = msg.substring(0,9);
      const nickCheck = msg.substring(0,5);
      // check for the rgb command
      if (rgbCheck === '/nickcolor') {
        // regex to see if the supplied rgb value is valid
        let regex = new RegExp('^(?:[A-Fa-f0-9]{6})$');
        let newRGB = msg.substring(10);
        let validRGB = regex.test(newRGB);
        // if it is, change the rgb associated with this socket
        // and update the client UI and cookies
        if (validRGB) {
          socket.rgb = '#'+newRGB;
          socket.emit('setCookies',socket.nickname,socket.rgb);
          socket.emit('update user header',socket.nickname, socket.rgb);
        } else {
          // if the rgb wasn't valid, supply an admin message letting the user know
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          socket.emit('admin message', 'Sorry ' + socket.nickname + ', invalid rgb value!')
          return;
        }
      }
      // check for the nickname change command
      if (nickCheck === '/nick') {
        let newNick = msg.substring(6) ;
        // make sure the nickname is less than 15 characters
        if (newNick.length > 15){
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
          messages.push('Sorry ' + socket.nickname + ', nickname must be 15 characters or less!');
          io.emit('admin message', 'Sorry ' + socket.nickname + ', nickname must be 15 characters or less!') ;
          return;
        }
        // check if the user list already contains identical nickname
        // if not, update the user list, and client side UI/cookies
        if (!(users.has(newNick))) {
          users.delete(socket.nickname);
          socket.nickname = newNick;
          users.add(socket.nickname);
          let msgUsers = Array.from(users);
          io.emit('update user list', msgUsers);
          socket.emit('setCookies',socket.nickname,socket.rgb);
          socket.emit('update user header',socket.nickname, socket.rgb);
        } else {
          // if the user list contained the nickname already, supply admin message to let user know
          let current_time = moment().format("HH:mm");
          socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
          socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
          io.emit('admin message', 'Sorry ' + socket.nickname + ', that nickname already exits!') ;
          messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
          messages.push('Sorry ' + socket.nickname + ', that nickname already exits!');
          return;
        }
      // check for a forward slash not fitting previous conditions
      // assume this is an invalid command, and let the user know through an admin message
      } else if (msg[0] === '/' && rgbCheck != '/rgb') {
        let current_time = moment().format("HH:mm");
        socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
        socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
        messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
        io.emit('admin message', 'Unrecognized command. Accepted commands: /nick , /rgb');
        messages.push('Unrecognized command. Accepted commands: /nick , /rgb');
        return;
      }
      // if all the command checks are passed, the message should be a simple chat message
      // update all client UIs and add the message to stored messages
      let current_time = moment().format("HH:mm");
      socket.emit('chat message', current_time , socket.nickname, msg, socket.rgb, true);
      socket.broadcast.emit('chat message', current_time , socket.nickname, msg, socket.rgb, false);
      messages.push(current_time + ' ' + socket.nickname + ': ' + msg);
      console.log(users);
    });
    // if there's a socket disconnect, delete that user from the active user list
    // update client UIs
    socket.on('disconnect', function () {
      users.delete(socket.nickname);
      let msgUsers = Array.from(users);
      io.emit('update user list', msgUsers);
    });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});