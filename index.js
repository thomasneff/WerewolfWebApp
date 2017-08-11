
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var GamePhaseHandler = require('./GamePhaseHandler');

myHandler = new GamePhaseHandler();


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log("CONNECTION");
    socket.on('start_blabla', function(msg){

      console.log("Connect: " + msg);

    });

    socket.on('chat message', function(msg){
        myHandler.handleEvent(socket, msg);
        
        if(msg == "start")
            {
                myHandler.startGame();
            }
      io.emit('chat message', msg);
    });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});