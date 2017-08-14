//to change background color
/* $(function(){
  $("body").css("background-color","black");
}); */
var activatedCard = null;
var cardState = 0;
var canVote = 0;
var ttsEnabled = 0;

var $inputField = $('#file');

var clientUUID = null;
var socket = io();


$inputField.on('change', function (e) {
  var file = e.target.files[0];

  if (file) {
    if (/^image\//i.test(file.type)) {
      //TODO: we should rewrite this routine so it sends stuff to the server correctly.
      readFile(file, function (base64Image) {
        //callback for sending image to the server
        //TODO: maybe also use an object on client-side, similar to playerData on server-side
        socket.emit('image_change', { UUID: clientUUID, img: base64Image });
      }
      );
    } else {
      alert('Not a valid image!');
    }
  }
});


function updatePlayerData(playerData) {

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
        createCard(obj);
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

function highlightCard(object) {

  if (activatedCard != null) {
    activatedCard.removeClass("voted_for_this_card");
  }

  object.addClass("voted_for_this_card");
}

function UserReady(object) {  
  console.log("UserReady");
  object.parent("div").parent("div").addClass("Ready");
  object.prop( "disabled", true );
  }

function changeOwnPlayerInfo(playerInfo) {
  $("#PLAYER_NAME").text(playerInfo.name);
  $('#PLAYER_NAME_INPUT').val(playerInfo.name);
  canVote = playerInfo.canVote;
  $("#PHASE_NAME").text("Phase: " + playerInfo.gamePhase);
}

function createCard(playerInfo) {
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
    cardClick($(this).find('.card'));
  });
  templateCopy.show();
}

function Speak(SpeakInfo) {
console.log("Speak with language:"+SpeakInfo.Language);
console.log("\r\n And Text:"+SpeakInfo.Text);
responsiveVoice.speak(SpeakInfo.Text, SpeakInfo.Language);
}


function cardClick(object) {
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

//Ready Button
$('#READY_BUTTON').click(function () {
  console.log("READY PRESSED");
  UserReady($(this));
  socket.emit('ready', { UUID: clientUUID, ready: 1 });
  socket.emit('start', { UUID: clientUUID });

});

//Join Button
$('#JOIN_BUTTON').click(function () {
  console.log("JOIN PRESSED");

  socket.emit('join_room', { UUID: clientUUID, room: 'test_room' });
});

//Create Button
$('#CREATE_BUTTON').click(function () {
  console.log("CREATE PRESSED");

  socket.emit('create_room', {
    UUID: clientUUID,
    room: 'test_room',
    phaseTimeouts: {
      "Day": 30,
      "Werewolves": 10
    }
  });
});

//Input Text Box
$('#PLAYER_NAME_INPUT').bind('input', function () {
  console.log("INPUT CHANGED " + $(this).val());
  socket.emit('name_change', { UUID: clientUUID, name: $(this).val() });
});

/*$('.card').click(function()
{
  
  cardClick($(this));


});*/

function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}


$(function () {


  if (localStorage.hasOwnProperty("werewolfAppID")) {
    clientUUID = localStorage.getItem("werewolfAppID")
    socket.emit('start_blabla', clientUUID);
    console.log("TEST1 " + clientUUID);
  }
  else {

    clientUUID = guidGenerator()
    localStorage.setItem("werewolfAppID", clientUUID) // here someid from your google analytics fetch
    socket.emit('start_blabla', clientUUID);
    console.log("TEST2 " + clientUUID);
  }

  socket.emit('client_connect', { UUID: clientUUID });

  socket.on('join_ack', function (msg) {
    console.log("JOIN ACKED: " + msg);
  });

  socket.on('ready_ack', function (msg) {
    console.log("READY ACKED: " + msg);
    canVote = msg.canVote;
  });

  socket.on('chat message', function (msg) {
    $('#messages').append($('<li>').text(msg));
  });

  socket.on('player_data_update', function (msg) {
    updatePlayerData(msg);
  });

  socket.on('player_speak', function (msg) {
    console.log("SPEAK");
    Speak(msg);
  });



  socket.on('time_update', function (msg) {
    //console.log("TIME UPDATE!!!! " + msg);
    if (ttsEnabled) {
      //responsiveVoice.speak("Welcome to anus werewolf " + $('#PLAYER_NAME').text(), "Deutsch Female");
    }

    var date = new Date(null);
    date.setSeconds(msg); // specify value for SECONDS here
    date = date.toISOString().substr(14, 5);
    $('#TIME_VALUE').text(date);
  });
});



//on clicking the image
$('.info-card').click(function () {
  console.log("PENI addwaS");
  responsiveVoice.speak("");
  ttsEnabled = 1;
  console.log("TTS ENABLED")
  //handleFile();
  //createCard({ name: "ANUSNAME" });


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
