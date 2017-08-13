
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

  //This event is received when a client selects another player (vote)
  socket.on('player_vote', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      //handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);

      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      // handler.broadcastPlayerData();
      handler.printAllUUIDS();
      handler.handleVote(msg.UUID, msg);
    }

  });

  socket.on('join_room', function (msg) {

    console.log("join_room: " + msg.room + " by " + msg.UUID);


    if(msg.UUID in UUIDSocketMap && msg.UUID in UUIDRoomMap)
      {
        //check if we were already connected.
        console.log("Was already connected, just resending data.");
        //TODO/HACK: remove this, just for now, I send them their playerdata back.
        var handler = getGamePhaseHandlerFromUUID(msg.UUID);
        
            if (handler != null) {
              
              handler.printAllUUIDS();
              //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
              handler.broadcastPlayerData();
        
            }

        return;
      }

    UUIDSocketMap[msg.UUID] = socket;
    UUIDRoomMap[msg.UUID] = msg.room;
    socket.join(msg.room);

    //NOTE: if you want to send a message to just a specific room, use this
    //io.to(msg.room).emit("join_ack", "JOIN ACKED SERVER BLA");

    if (!(msg.room in GamePhaseHandlers)) {
      console.log("Added new GamePhaseHandler for room " + msg.room)
      GamePhaseHandlers[msg.room] = new GamePhaseHandler(io.to(msg.room));
    }

    
    //add specific socket to GamePhaseHandler so we can send specific messages to each player
    GamePhaseHandlers[msg.room].addUUIDSocket(msg.UUID, socket);

    GamePhaseHandlers[msg.room].printAllUUIDS();
    //broadcast initial state so all players get stuff upon connecting
    GamePhaseHandlers[msg.room].broadcastPlayerData();
  });

  socket.on('name_change', function (msg) {
    console.log("name_change: " + msg.name + " by " + msg.UUID);

    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'name', msg.name);

      handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();

    }

  });

  socket.on('image_change', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);

      handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();

    }
  });

  socket.on('ready', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'ready', msg.ready);

      handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();

      //example of sending to a specific player
      //handler.sendToPlayer(msg.UUID, 'ready_ack', {canVote: 1});

    }
  });


  socket.on('start', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      

      handler.startGame();

    }
  });

  socket.on('NOT_IMPLEMENTED_YET', function (msg) {

    console.log("start: " + msg.UUID);

    var handler = getGamePhaseHandlerFromUUID(msg.UUID);

    if (handler != null) {
      handler.startGame();
    }

  });

});


http.listen(3000, function () {
  console.log('listening on *:3000');
});