    //to change background color
    /* $(function(){
      $("body").css("background-color","black");
    }); */
    var activatedCard = null;
    var cardState = 0;
    var canVote = 0;
    var ttsEnabled = 0;


    function cardClick(object)
    {
      console.log("Called with " + object);

      //console.log($(this));
      

      if(canVote == 0)
      {
        return;
      }

      if(activatedCard != null)
      {
        activatedCard.removeClass("voted_for_this_card");
      }

      object.addClass("voted_for_this_card");

      if(activatedCard != object)
      {
        activatedCard = object;
        //TODO: send to server if card changed
      }


    }


    /*$('.card').click(function()
    {
      
      cardClick($(this));


    });*/

    function guidGenerator() {
        var S4 = function() {
          return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }


    $(function () {

      
        var socket = io();

        if (localStorage.hasOwnProperty("werewolfAppID")) {
            cli_id = localStorage.getItem("werewolfAppID")
            socket.emit('start_blabla', cli_id);
            console.log("TEST1 " + cli_id);
        }
        else {

            cli_id = guidGenerator()
            localStorage.setItem("werewolfAppID", cli_id) // here someid from your google analytics fetch
            socket.emit('start_blabla', cli_id);
            console.log("TEST2 " + cli_id);
        }


        socket.emit('start', cli_id);

        
        socket.on('chat message', function(msg){
        $('#messages').append($('<li>').text(msg));
        });

        socket.on('time_update', function(msg){
          console.log("TIME UPDATE!!!! " + msg);
          if(ttsEnabled)
            {
              responsiveVoice.speak("Welcome to werewolf " + $('#PLAYER_NAME').text(), "Deutsch Female");
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
      var template = $('#CARD_TEMPLATE');
      var templateCopy = template.clone();
      templateCopy.attr("id", "UUID_FROM_SERVER_TODO");
      templateCopy.appendTo($('#CARD_LIST'));
      templateCopy.on('click', null, function() {
        cardClick($(this).find('.card'));
      });
      templateCopy.show();

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
