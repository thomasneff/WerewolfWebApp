
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var express = require('express');
app.use(express.static(path.join(__dirname, 'public')));
var GamePhaseHandler = require('./GamePhaseHandler');

var GamePhaseHandlers = {};

//TODO: map from UUID -> roomID (for reconnecting users)
//TODO: map from roomID -> GamePhaseHandler (for managing different games)
//TODO: maybe we need an array from UUID -> socket? at least the GamePhaseHandler should have this to send specific calls.

//NOTE: we always send objects via socket.io, have to access the attributes in all respective calls.
//NOTE: we always send the UUID.
var UUIDSocketMap = {}
var UUIDRoomMap = {}


app.get('/', function (req, res) {
  //res.sendFile(__dirname + '/index.html');
  res.sendFile(__dirname + '/ui_layout_experiments/index.html');
});



function getGamePhaseHandlerFromUUID(UUID) {
  if (!(UUID in UUIDRoomMap)) {
    console.log("UUID not assigned to room! ", UUID)
    return null;
  }

  room_id = UUIDRoomMap[UUID];
  if (!(room_id in GamePhaseHandlers)) {
    console.log("Room not in GamePhaseHandlers! ", room_id)
    return null;
  }

  return GamePhaseHandlers[room_id];
}


io.on('connection', function (socket) {
  //console.log("CONNECTION");
  socket.on('join_room', function (msg) {

    console.log("join_room: " + msg.room + " by " + msg.UUID);

    UUIDSocketMap[msg.UUID] = socket;
    UUIDRoomMap[msg.UUID] = msg.room;
    socket.join(msg.room);

    //NOTE: if you want to send a message to just a specific room, use this
    //io.to(msg.room).emit("join_ack", "JOIN ACKED SERVER BLA");

    if (!(msg.room in GamePhaseHandlers)) {
      console.log("Added new GamePhaseHandler for room " + msg.room)
      GamePhaseHandlers[msg.room] = new GamePhaseHandler(io.to(msg.room));
    }
  });

  socket.on('name_change', function (msg) {
    console.log("name_change: " + msg.name + " by " + msg.UUID);

    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.changePlayerName(msg.UUID, msg.name);

      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();

    }

  });

  socket.on('image_change', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.changePlayerImage(msg.UUID, msg.img);

      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();

    }
  });

  socket.on('start', function (msg) {

    console.log("start: " + msg.UUID);

    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.startGame();
    }

  });

  socket.on('chat message', function (msg) {
    myHandler.handleEvent(socket, msg);


    io.emit('chat message', msg);
  });
});


http.listen(3000, function () {
  console.log('listening on *:3000');
});