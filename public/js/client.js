var activatedCard = null;
var cardState = 0;
var canVote = 0;
var ttsEnabled = 0;

var serverInputField = $('#serverImageUploadInput');
var clientInputField = $('#clientImageUploadInput');

var clientUUID = null;
var socket = io();

var playerImage = null;

var roomToJoin = null;

var currentScreen = "RoomList";

//General functions
$(function () {
  //On startup check if UUID already exists, otherwise create one and send to server
  if (localStorage.hasOwnProperty("werewolfAppID")) {
    clientUUID = localStorage.getItem("werewolfAppID")
  }
  else {
    clientUUID = guidGenerator()
    localStorage.setItem("werewolfAppID", clientUUID)
  }
  socket.emit('client_connect', { UUID: clientUUID });

  //Server Receive Callbacks:
  socket.on('player_data_update', function (msg) {
    console.log("received player data");
    updatePlayerData(msg);
  });
  socket.on('player_speak', function (msg) {
    console.log("Player Speak");
    Speak(msg);
  });
  socket.on('time_update', function (msg) {
    console.log("Time update");
    var date = new Date(null);
    date.setSeconds(msg); // specify value for SECONDS here
    date = date.toISOString().substr(14, 5);
    $('#TIME_VALUE').text(date);
  });

  socket.on('already_ingame', function (msg) {
    //we were already in a game, simply show that again.
    console.log("received already-ingame");
    currentScreen = "GameScreen";
    hideShowSection($("#RoomList"), $("#GameScreen"));
  });

  //We have this extra event so the view doesn't flicker through showing/hiding of sections.
  socket.on('room_list', function (roomList) {
    console.log("Start screen will be shown.")
    $('#GENERATED_ROOM_LIST').empty();
    roomList.forEach(function (roomInfo) {
      createRoomListCard(roomInfo)
    }, this);
    $('#GameScreen').hide();
    $('#JoinServerScreen').hide();
    $('#CreateServerScreen').hide();
    $('#RoomList').show();
  });

  socket.on('client_alert', function (msg) {
    console.log("ALERT!");
    alert(msg.toString());
  });
});

//Player related stuff:
function changeOwnPlayerInfo(playerInfo) {
  $("#PLAYER_NAME").text(playerInfo.name);
  //$('#PLAYER_NAME_INPUT').val(playerInfo.name);
  canVote = playerInfo.canVote;
  if (playerInfo.gameStarted == 1) {
    $('#READY_BUTTON').hide();
    $('#READY_BUTTON').prop("disabled", true);
  }
  $("#PHASE_NAME").text("Phase: " + playerInfo.gamePhase);

  //Change Character Related Stuff:
  $("#CHARACTER_NAME").text(playerInfo.role);
}

function updatePlayerData(playerData) {
  //If we receive playerData, we must be in game. Hide everything else.
  $('#RoomList').hide();
  $('#JoinServerScreen').hide();
  $('#CreateServerScreen').hide();
  $('#GameScreen').show();

  //clear all cards
  $('#GENERATED_CARDS').empty();
  //iterate over all things in playerData
  for (var key in playerData) {
    console.log("Key " + key);
    if (playerData.hasOwnProperty(key)) {
      var obj = playerData[key];
      console.log("Creating card for key " + key);
      if (key == clientUUID) {
        changeOwnPlayerInfo(obj);
      }
      else {
        createPlayerInfoCard(obj);
        console.log("Created card with UUID " + obj.UUID);
      }
    }
  }
  //also highlight currentVote card
  console.log("PLAYERDATA " + playerData);
  console.log("PLAYERDATA[CLIENTUUID] " + playerData[clientUUID]);
  if ("currentVote" in playerData[clientUUID]) {
    highlightCard($("#" + playerData[clientUUID].currentVote));
  }
}

//Helperfunctions
function highlightCard(object) {
  if (activatedCard != null) {
    activatedCard.removeClass("voted_for_this_card");
  }
  object.addClass("voted_for_this_card");
}

function UserReady(object) {
  console.log("UserReady");
  object.hide();
  object.parent("div").parent("div").addClass("Ready");
  object.prop("disabled", true);
}

function createRoomListCard(roomInfo) {
  //{type:"Fiat", model:"500", color:"white"};
  var template = $('#ROOMLIST_CARD_TEMPLATE');
  var templateCopy = template.clone();
  //templateCopy.attr("id",  playerInfo.UUID);
  templateCopy.find('.room-name').text(roomInfo.room);
  templateCopy.find('.room-img').attr("src", roomInfo.hostImg);
  templateCopy.find('.room-numPlayers').text("Connected: " + roomInfo.numPlayers);
  templateCopy.find('.room-hostName').text("Host: " + roomInfo.hostName);
  //console.log("PLAYERINFO UUID: " + playerInfo.UUID);
  //console.log("CARD ATTR ID before: " + templateCopy.find('.card').attr("id"));
  templateCopy.find('.card').attr("id", roomInfo.room);
  //console.log("CARD ATTR ID after: " + templateCopy.find('.card').attr("id"));
  //TODO: image data, just base64 encode the image and send it via the socket
  templateCopy.appendTo($('#GENERATED_ROOM_LIST'));
  templateCopy.on('click', null, function () {
    roomListCardClick($(this).find('.card'));
  });
  templateCopy.show();
}

function roomListCardClick(object) {
  console.log("Called with " + object);
  //TODO: save room name, show join screen with password, upon join send all stuff
  roomToJoin = object.attr('id');

  //push to history for back button functionality :)
  currentScreen = "JoinServerScreen";
  window.history.pushState(currentScreen, "");
  
  hideShowSection($("#RoomList"), $("#JoinServerScreen"));
}

function createPlayerInfoCard(playerInfo) {
  //{type:"Fiat", model:"500", color:"white"};
  var template = $('#CARD_TEMPLATE');
  var templateCopy = template.clone();
  //templateCopy.attr("id",  playerInfo.UUID);
  templateCopy.find('.player-name').text(playerInfo.name);
  templateCopy.find('.player-img').attr("src", playerInfo.img);
  //console.log("PLAYERINFO UUID: " + playerInfo.UUID);
  //console.log("CARD ATTR ID before: " + templateCopy.find('.card').attr("id"));
  templateCopy.find('.card').attr("id", playerInfo.UUID);
  //console.log("CARD ATTR ID after: " + templateCopy.find('.card').attr("id"));
  //TODO: image data, just base64 encode the image and send it via the socket
  templateCopy.appendTo($('#GENERATED_CARDS'));
  templateCopy.on('click', null, function () {
    playerInfoCardClick($(this).find('.card'));
  });
  templateCopy.show();
}

function Speak(SpeakInfo) {
  responsiveVoice.speak(SpeakInfo.Text, SpeakInfo.Language);
}

function playerInfoCardClick(object) {
  console.log("Called with " + object);
  //console.log($(this));
  //Server also checks this.
  if (canVote == 0) {
    return;
  }
  highlightCard(object);
  if (activatedCard != object) {
    activatedCard = object;
    //TODO/DONE: send to server if card changed
    //we always have to send our own UUID, that's why we also send a voteUUID as well
    socket.emit("player_vote", { UUID: clientUUID, voteUUID: object.attr('id') });
  }
}
function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function hideShowSection(sectionHide, sectionShow) {
  sectionHide.hide();
  sectionShow.show();
  //scroll to top as we might have been at the bottom
  $('html,body').scrollTop(0);
}

//Buttons and Callbacks:
//Not available anymore
/*$('#JOIN_SCREEN_BUTTON').click(function () {
  console.log("JOIN Screen");
  socket.emit('buttonPressed', "JoinScreen");
  //Hide join section, show game section
  hideShowSection($("#RoomList"), $("#JoinServerScreen"));

});*/

$('#CREATE_SCREEN_BUTTON').click(function () {
  console.log("CREATE Screen");
  socket.emit('require_room_config', 1);
  //push to history for back button functionality :)
  currentScreen = "CreateServerScreen";
  window.history.pushState(currentScreen, "");
  //Hide join section, show game section
  hideShowSection($("#RoomList"), $("#CreateServerScreen"));
});

$('#CREATE_BUTTON').click(function () {
  console.log("CREATE PRESSED");

  var pass = $('#SERVER_PWD_INPUT').val();
  var room = $('#SERVER_NAME_INPUT').val()
  var playerName = $('#SERVER_PLAYER_NAME_INPUT').val()

  console.log("Roomname: " + room);
  console.log("RoomPwd: " + pass);

  socket.emit('create_room', {
    UUID: clientUUID,
    name: playerName,
    img: playerImage,

    serverData: {
      room: room,
      pass: pass,
      host: clientUUID
    },

    phaseTimeouts: {
      "Day": 30,
      "Werewolves": 10
    }
  });
  //Create should also automatically join.
  //TODO: maybe we should store all the input form val()'s in js variables / objects?
  socket.emit('join_room', { UUID: clientUUID, pass: pass, room: room, name: playerName, img: playerImage });
  
    //DON'T DO THAT IF SERVER CREATION FAILS!!
  //Hide join section, show game section
  //currentScreen = "GameScreen";
  //hideShowSection($("#CreateServerScreen"), $("#GameScreen"));

});

$('#JOIN_BUTTON').click(function () {
  console.log("JOIN PRESSED");
  var name = $('#CLIENT_PLAYER_NAME_INPUT').val()
  var pass = $("#CLIENT_PWD_INPUT").val()
  socket.emit('join_room', { UUID: clientUUID, name: name, img: playerImage, room: roomToJoin, pass: pass });
});

$('#CREATE_BACK_BUTTON').click(function () {
  console.log("BACK PRESSED");
    //TODO: Refresh Serverlist ?!?
  hideShowSection($("#CreateServerScreen"), $("#RoomList"));
});

$('#JOIN_BACK_BUTTON').click(function () {
  console.log("BACK PRESSED");
    //TODO: Refresh Serverlist ?!?
  hideShowSection($("#JoinServerScreen"), $("#RoomList"));
});

$('#READY_BUTTON').click(function () {
  console.log("READY PRESSED");
  UserReady($(this));
  socket.emit('ready', { UUID: clientUUID, ready: 1 });
  socket.emit('start', { UUID: clientUUID });
});

/*
$('#PLAYER_NAME_INPUT').bind('input', function () {
  console.log("INPUT CHANGED " + $(this).val());
  socket.emit('name_change', { UUID: clientUUID, name: $(this).val() });
});*/

$('.info-card').click(function () {
  responsiveVoice.speak("");
  ttsEnabled = 1;
  console.log("TTS ENABLED")
  //handleFile();
  if (cardState == 1) {
    $(this).removeClass('flipped_front');
    $(this).addClass('flipped_back');
    cardState = 0;
  }
  else {
    $(this).removeClass('flipped_back');
    $(this).addClass('flipped_front');
    cardState = 1;
  }
});

function imageFileHandler(e) {
  //console.log("IMAGEFILEHANDLER");
  var file = e.target.files[0];
  if (file) {
    if (/^image\//i.test(file.type)) {
      //TODO: we should rewrite this routine so it sends stuff to the server correctly.
      readFile(file, function (base64Image) {
        //callback for sending image to the server
        //TODO: maybe also use an object on client-side, similar to playerData on server-side
        playerImage = base64Image;
        //console.log("IMAGE SET!");
        socket.emit('image_change', { UUID: clientUUID, img: base64Image });
      }
      );
    } else {
      alert('Not a valid image!');
    }
  }
}

serverInputField.on('change', imageFileHandler);
clientInputField.on('change', imageFileHandler);



window.onpopstate = function (event) {

  console.log(event);

  if (event.state == "JoinServerScreen") // get the current state from the event obj
  {
    if (currentScreen == "JoinServerScreen") {
      //If we were on "JoinServerScreen", we hide it and show the start screen again.
      //Hide join section, show room list
      currentScreen = "RoomList";
      hideShowSection($("#JoinServerScreen"), $("#RoomList"));
    }
    else if (currentScreen == "RoomList")
      {
        //We want to go "forward" again
        currentScreen = "JoinServerScreen";
        hideShowSection($("#RoomList"), $("#JoinServerScreen"));
      }

  }
  else if (event.state == "GameScreen") {
    //Do nothing? We don't want to go away from the game screen, I guess
  }
  else if (event.state == "CreateServerScreen") {
    if (currentScreen == "CreateServerScreen") {
      //If we were on "CreateServerScreen", we hide it and show the start screen again.
      //Hide join section, show room list
      currentScreen = "RoomList";
      hideShowSection($("#CreateServerScreen"), $("#RoomList"));
    }
    else if (currentScreen == "RoomList")
      {
        //We want to go "forward" again
        currentScreen = "CreateServerScreen";
        hideShowSection($("#RoomList"), $("#CreateServerScreen"));
      }
  }
  //location.reload(); // reloads the current page to clear ajax changes
};

