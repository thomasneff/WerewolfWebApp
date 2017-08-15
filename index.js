var app = require('express')();
var express = require('express');
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require("fs");
var language_de = require('./Resources/Language/language_de');

//Example for language usage. We could make a big object, indexed by language short-strings (e.g. de, en, ...)
//var localization = require('./Resources/localization');
//localization.en.Speak.StartGame, localization['de'].Speak.StartGame, ... could easily access all that.
//console.log(language_de.Speak.StartGame);

app.use(express.static(path.join(__dirname, 'public')));

var GameHandler = require('./GameHandler');
var GameHandlers = {};

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

function getGameHandlerFromUUID(UUID) {
  if (!(UUID in UUIDRoomMap)) {
    console.log("UUID not assigned to room! ", UUID)
    return null;
  }
  room_id = UUIDRoomMap[UUID];
  if (!(room_id in GameHandlers)) {
    console.log("Room not in GameHandlers! ", room_id)
    return null;
  }
  return GameHandlers[room_id];
}

function checkSocketAndGivenUUID(UUID, socket) {
  //For every message, we need to check if the socket/UUID we have stored upon first connecting
  //matches the socket/UUID of any given message.


  if (!(UUID in UUIDSocketMap) || UUIDSocketMap[UUID] != socket) {
    console.log("Error, given client UUID does not match stored socket, someone sent a wrong/fake UUID with its message!");
    console.log("UUID given: " + UUID);
    return false;
  }

  return true;
}

function getRoomList() {
  //Iterate over all GameHandlers (which are open games), check if they are running or not (we can only join if they are not running)
  //And get RoomInfo from the GameHandler
  roomList = [];

  for (var UUID in GameHandlers) {

    if (GameHandlers.hasOwnProperty(UUID)) {

      var handler = GameHandlers[UUID];

      //Skip over running games
      if (handler.isGameStarted()) {
        continue;
      }

      roomList.push(handler.getRoomListData());

    }

  }

  return roomList;
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

  socket.on('require_room_config', function (msg) {
    console.log("REQUIRE_ROOM_CONFIG!!!!");
  });

  //This event is received when a client selects another player (vote)
  socket.on('player_vote', function (msg) {

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      console.log("WRONG UUID IN player_vote");
      return;
    }

    var handler = getGameHandlerFromUUID(msg.UUID);
    if (handler != null) {
      //handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      // handler.broadcastPlayerData();
      //handler.printAllUUIDS();
      handler.handleVote(msg.UUID, msg);
    }
  });
  //Try to load pages based on their state...
  socket.on('buttonPressed', function (msg) {
    console.log("Button pressed: " + msg.toString());
  });

  socket.on('client_connect', function (msg) {
    console.log("client_connect by " + msg.UUID);
    //TODO: check if client was already connected, resend necessary info if that is the case
    if (msg.UUID in UUIDSocketMap && msg.UUID in UUIDRoomMap) {
      //check if we were already connected.
      console.log("Was already connected, just resending data.");
      //TODO/HACK: might want to remove this, just for now, I send them their playerdata back, we can probably use this though.
      //Reconnect scenario: client should just check the response, and if the roomName is there, send a join, update UI
      var handler = getGameHandlerFromUUID(msg.UUID);
      if (handler != null) {
        //handler.printAllUUIDS();
        //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?

        //we need to make sure the socket joins the room again to receive messages.
        socket.leaveAll();
        socket.join(UUIDRoomMap[msg.UUID]);
        UUIDSocketMap[msg.UUID] = socket;

        handler.broadcastPlayerData();
        handler.sendToPlayer(msg.UUID, "already_ingame", 1);
      }
      return;
    }
    //We were not connected, so just allocate the server-side stuff
    //TODO: send them a list of rooms with name, host-image, number of players
    UUIDSocketMap[msg.UUID] = socket;
    //UUIDRoomMap[msg.UUID] = msg.room;
    //Make them join a room which is reserved for the room list

    //emit a message saying that we are on the start screen, in addition to the "Room List"

    roomList = getRoomList();

    socket.emit("room_list", roomList);

    socket.join("ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST");
    console.log("Socket with UUID " + msg.UUID + " joined room list!");



    //Set Screen:
    //var text = fs.readFileSync("./Resources/Pages/StartScreen.html");
    //io.emit("draw_screen", text.toString());
  });
  socket.on('join_room', function (msg) {

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      console.log("WRONG UUID IN join_room");
      return;
    }

    console.log("join_room: " + msg.room + " by " + msg.UUID);
    if (!(msg.room in GameHandlers)) {
      console.log("Cannot join room " + msg.room + " as it doesn't exist. By UUID " + msg.UUID);
      return;
    }

    var handler = GameHandlers[msg.room];

    //TODO: check if necessary?
    /*if (msg.UUID in UUIDSocketMap && msg.UUID in UUIDRoomMap) {
      //check if we were already connected.
      console.log("Was already connected, just resending data.");
      //TODO/HACK: remove this, just for now, I send them their playerdata back.
      var handler = getGameHandlerFromUUID(msg.UUID);
      if (handler != null) {
        //handler.printAllUUIDS();
        //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
        handler.broadcastPlayerData();
      }
      return;
    }*/


    //If we were not in the room, but trying to join, we need to check if the game is already running.
    //This should probably never happen unless someone uses the browser console to send join events to specific games.
    if (handler.getGameState().gameStarted != 0) {
      console.log("Game in room " + msg.room + " is already running, can not join! UUID: " + msg.UUID);

      socket.leaveAll();

      roomList = getRoomList();

      socket.emit("room_list", roomList);

      //Join roomList again, and send "room_list" event again.
      socket.join("ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST");


      return;
    }

    //Check for password match
    //TODO: plaintext passwords suck, I guess, but we probably just have to hash the passwords when we send them or something and we'll be fine.
    //If pass is blank ("") we'll just skip the check as well.
    if (handler.getUpdatedHostServerData().pass != "" && handler.getUpdatedHostServerData().pass != msg.pass) {
      console.log("Wrong password for room " + msg.room + "!");
      console.log("Is: " + msg.pass + " | Should be: " + handler.getUpdatedHostServerData().pass);

      socket.leaveAll();

      roomList = getRoomList();

      socket.emit("room_list", roomList);

      //Join roomList again, and send "room_list" event again.
      socket.join("ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST");
      return;
    }




    //UUIDSocketMap[msg.UUID] = socket;
    UUIDRoomMap[msg.UUID] = msg.room;
    socket.leaveAll();
    socket.join(msg.room);

    console.log("Socket with UUID " + msg.UUID + " joined room " + msg.room);
    //console.log("Connected clients: " + io.sockets.clients(msg.room));
    //NOTE: if you want to send a message to just a specific room, use this
    //io.to(msg.room).emit("join_ack", "JOIN ACKED SERVER BLA");
    //add specific socket to GameHandler so we can send specific messages to each player
    handler.addUUIDSocket(msg.UUID, socket);

    //Init player from other message content, such as name, image
    handler.initPlayerDataFromOptions(msg);
    //GameHandlers[msg.room].printAllUUIDS();
    //broadcast initial state so all players get stuff upon connecting
    handler.broadcastPlayerData();

   
  });
  socket.on('create_room', function (msg) {
    //msg has to contain the different options for the game
    //Check if room already exists or is reserved for room list

    var serverData = msg.serverData

    if (serverData.room in GameHandlers) {
      console.log("Tried to create room which already exists: " + serverData.room + " by " + msg.UUID);
      return;
    }
    if (serverData.room == "ROOM_LIST_ROOM_WHICH_CAN_NOT_BE_SELECTED_AS_A_NAME_BY_ANY_HOST") {
      console.log("Tried to create reserved room: " + serverData.room + " by " + msg.UUID);
      return;
    }
    //TODO: this should be done when creating the room with all config options by the host, not when joining. (REFACTOR TO CREATE AND JOIN)
    //TODO: we also shouldn't be able to join a room which doesn't exist (REFACTOR TO CREATE AND JOIN)
    if (!(serverData.room in GameHandlers)) {
      console.log("Added new GameHandler for room " + serverData.room)
      GameHandlers[serverData.room] = new GameHandler(io, msg);
    }
  });

  //name and image change are obsolete now, as this all happens when you create/join a room.
  /*
  socket.on('name_change', function (msg) {

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      return;
    }

    var handler = getGameHandlerFromUUID(msg.UUID);
    if (handler != null) {
      console.log("name_change: " + msg.name + " by " + msg.UUID);
      handler.changePlayerDataKeyValue(msg.UUID, 'name', msg.name);
      //handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();
    }
    else {
      console.log("Game is not started yet, cannot change name by " + msg.UUID);
    }
  });
 
  socket.on('image_change', function (msg) {

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      return;
    }


    var handler = getGameHandlerFromUUID(msg.UUID);
    if (handler != null) {
      handler.changePlayerDataKeyValue(msg.UUID, 'img', msg.img);
      //handler.printAllUUIDS();
      //TODO: resending everything might be a waste, maybe just send specific things which are then updated client-side?
      handler.broadcastPlayerData();
    }
  });
  */
  socket.on('ready', function (msg) {

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      console.log("WRONG UUID IN ready");
      return;
    }

    var handler = getGameHandlerFromUUID(msg.UUID);
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

    if (checkSocketAndGivenUUID(msg.UUID, socket) == false) {
      //Someone sent a wrong UUID.
      console.log("WRONG UUID IN start");
      return;
    }

    var handler = getGameHandlerFromUUID(msg.UUID);
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

