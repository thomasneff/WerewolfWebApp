var app = require('express')();
var express = require('express');
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static(path.join(__dirname, 'public')));

var GamePhaseHandler = require('./GamePhaseHandler');
var GamePhaseHandlers = {};
var ConfigPhaseHandler = require('./ConfigPhaseHandler');
var ConfigPhaseHandlers = {};

//NOTE: we always send objects via socket.io, have to access the attributes in all respective calls.
//NOTE: we always send the UUID.
var UUIDSocketMap = {}
var UUIDRoomMap = {}

//Maps from roomID -> 0/1, depending on if the game is already started.
var RoomGameStarted = {}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
  console.log('listening on *:3000');
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

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

//Functions for Server-Callbacks
io.on('connection', function (socket) {
  //console.log("CONNECTION");
  //This event is received when a client selects another player (vote)
  socket.on('player_vote', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      //handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      // handler.broadcastPlayerData();
      //handler.printAllUUIDS();
      handler.handleVote(msg.UUID, msg);
    }
  });
  socket.on('client_connect', function (msg) {
    console.log("client_connect by " + msg.UUID);
    //TODO: check if client was already connected, resend necessary info if that is the case
    if (msg.UUID in UUIDSocketMap && msg.UUID in UUIDRoomMap) {
      //check if we were already connected.
      console.log("Was already connected, just resending data.");
      //TODO/HACK: might want to remove this, just for now, I send them their playerdata back, we can probably use this though.
      //Reconnect scenario: client should just check the response, and if the roomName is there, send a join, update UI
      var handler = getGamePhaseHandlerFromUUID(msg.UUID);
      if (handler != null) {
        //handler.printAllUUIDS();
        //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
        handler.broadcastPlayerData();
      }
      return;
    }
    //We were not connected, so just allocate the server-side stuff
    //TODO: send them a list of rooms with name, host-image, number of players
    UUIDSocketMap[msg.UUID] = socket;
    //UUIDRoomMap[msg.UUID] = msg.room;
    //Make them join a room which is reserved for the room list
    socket.join("ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST");
    console.log("Socket with UUID " + msg.UUID + " joined room list!");
  });
  socket.on('join_room', function (msg) {
    console.log("join_room: " + msg.room + " by " + msg.UUID);
    if (!(msg.room in GamePhaseHandlers)) {
      console.log("Cannot join room " + msg.room + " as it doesn't exist. By UUID " + msg.UUID);
      return;
    }
    if (msg.UUID in UUIDSocketMap && msg.UUID in UUIDRoomMap) {
      //check if we were already connected.
      console.log("Was already connected, just resending data.");
      //TODO/HACK: remove this, just for now, I send them their playerdata back.
      var handler = getGamePhaseHandlerFromUUID(msg.UUID);
      if (handler != null) {
        //handler.printAllUUIDS();
        //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
        handler.broadcastPlayerData();
      }
      return;
    }
    //If we were not in the room, but trying to join, we need to check if the game is already running.
    //This should probably never happen unless someone uses the browser console to send join events to specific games.
    if (msg.room in GamePhaseHandlers) {
      if (msg.room in RoomGameStarted) {
        if (RoomGameStarted[msg.room] != 0) {
          console.log("Game in room " + msg.room + " is already running, can not join! Will join random room UUID: " + msg.UUID);
          socket.join(guidGenerator());
          return;
        }
      }
    }
    //UUIDSocketMap[msg.UUID] = socket;
    UUIDRoomMap[msg.UUID] = msg.room;
    socket.leaveAll();
    socket.join(msg.room);
    console.log("Socket with UUID " + msg.UUID + " joined room " + msg.room);
    //console.log("Connected clients: " + io.sockets.clients(msg.room));
    //NOTE: if you want to send a message to just a specific room, use this
    //io.to(msg.room).emit("join_ack", "JOIN ACKED SERVER BLA");
    //add specific socket to GamePhaseHandler so we can send specific messages to each player
    GamePhaseHandlers[msg.room].addUUIDSocket(msg.UUID, socket);
    //GamePhaseHandlers[msg.room].printAllUUIDS();
    //broadcast initial state so all players get stuff upon connecting
    GamePhaseHandlers[msg.room].broadcastPlayerData();
  });
  socket.on('create_room', function (msg) {
    //msg has to contain the different options for the game
    //Check if room already exists or is reserved for room list
    if (msg.room in GamePhaseHandlers) {
      console.log("Tried to create room which already exists: " + msg.room + " by " + msg.UUID);
      return;
    }
    if (msg.room == "ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST") {
      console.log("Tried to create reserved room: " + msg.room + " by " + msg.UUID);
      return;
    }
    //TODO: this should be done when creating the room with all config options by the host, not when joining. (REFACTOR TO CREATE AND JOIN)
    //TODO: we also shouldn't be able to join a room which doesn't exist (REFACTOR TO CREATE AND JOIN)
    if (!(msg.room in GamePhaseHandlers)) {
      console.log("Added new GamePhaseHandler for room " + msg.room)
      GamePhaseHandlers[msg.room] = new GamePhaseHandler(io, msg);
    }
  });

  socket.on('name_change', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      console.log("name_change: " + msg.name + " by " + msg.UUID);
      handler.changePlayerDataKeyValue(msg.UUID, 'name', msg.name);
      //handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();
    }
    else
      {
        console.log("Game is not started yet, cannot change name by " + msg.UUID);
      }
  });

  socket.on('image_change', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);
      //handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();
    }
  });

  socket.on('ready', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'ready', msg.ready);
      //handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();
      //example of sending to a specific player
      //handler.sendToPlayer(msg.UUID, 'ready_ack', {canVote: 1});
    }
  });


  socket.on('start', function (msg) {
    var handler = getGamePhaseHandlerFromUUID(msg.UUID);
    if (handler != null) {
      if (handler.isGameStarted()) {
        console.log("Game is already started, can not start it again! " + msg.UUID);
        return;
      }
      handler.startGame();
      //We need this so we can check if a game is running while someone wants to join
      //as the join event needs to block new people server-side.
      RoomGameStarted[handler.getRoomName()] = handler.isGameStarted();
    }
  });
});

