
class GamePhaseHandler {

    /*
        ROLES:

        Werewolf,
        Townsperson,


        ALL_ROLES -> used by setDataKeyForeachRole to change stuff for everyone.
    */


    
    constructor(socket) {
        //TODO: should "Day" and "vote_kill" be separate? In the game, it is, but I think we could also just make it so that voting is enabled the whole Day.
        //      but for narration events it might make sense. We can still add them later, however.
        this.phases = ["Day", "Werewolves"]
        this.currentPhase = 1;
        //this.phaseTimeouts = 3; // for testing, 3 seconds. Should be configurable or 5 minutes or something (300 seconds)
        this.phaseTimeouts = {
            "Day": 300,
            "Werewolves": 10
        }

        //This contains the number of each of the special roles. For convenience, the attributes are *exactly* the same as the internal role names
        this.roleConfig = {
            "Werewolf": 1,
            "Witch": 0,
            "Seer": 0, //etc... Townspeople are always all the remaining players
        }

        this.timeoutObject = null;

        //This is the socket for the whole room
        this.socket = socket;

        //This is just for displaying the current timer to the clients.
        this.intervalTimer = null;
        this.secondCount = 100;

        //This is the whole playerData (UUID -> {name, role(s), img, canVote, ...})
        this.playerData = {};

        //This maps from UUID to specific sockets so we can communicate with specific players (e.g. host, specific roles...)
        this.UUIDSocketMap = {};

        //This maps from UUID to UUID, storing votes for the current phase. Gets cleared after each phase.
        //TODO: this should/could contain an object for each UUID, to enable specifics e.g. witch save/heal, ...
        this.votes = {};
    }

    printAllUUIDS()
    {
        for (var UUID in this.playerData) {
            if (this.playerData.hasOwnProperty(UUID)) {
                console.log("ALL_UUIDS: " + UUID);
            }
        }
    }


    checkAndCreateUUID(UUID) {
        if (!(UUID in this.playerData)) {
            //make new object for UUID if it doesn't exist yet
            //NOTE: here we can also do initialization for new players for internal state variables
            this.playerData[UUID] = { canVote: 0, role: 'Townsperson', UUID: UUID };
        }
    }

    currentPhaseString() {
        return this.phases[this.currentPhase];
    }
    /* changePlayerName(UUID, name)
    {
        this.checkAndCreateUUID(UUID);
        
        this.playerData[UUID].name = name;
        console.log("Player name changed to: " + name);
    }

    changePlayerImage(UUID, img)
    {

        this.checkAndCreateUUID(UUID);

        this.playerData[UUID].img = img;
        console.log("Player img changed to: " + img);
    } */

    changePlayerDataKeyValue(UUID, key, value) {
        //console.log("BEFORE")
        //this.printAllUUIDS();
        //console.log("WANT TO CHANGE ATTRIBUTE OF " + UUID);
        

        this.checkAndCreateUUID(UUID);
        //console.log("AFTER CHECK AND CREATE");
        //this.printAllUUIDS();

        this.playerData[UUID][key] = value;
        console.log("Player attribute " + key + " changed to " + value + " (UUID: " + UUID + ")");

        //this.printAllUUIDS();
    }

    addUUIDSocket(UUID, socket) {
        this.UUIDSocketMap[UUID] = socket;
    }

    //This function sets a specific key in playerData for each player of a given role
    //Can be e.g. used to set canVote for Werewolves.
    setDataKeyForeachRole(key, value, role) {
        for (var UUID in this.playerData) {

            if(UUID == undefined)
                {
                    console.log("OMGOMGOMGOMGOMG 1");
                }

            if (this.playerData.hasOwnProperty(UUID)) {

                var obj = this.playerData[UUID];


                if (!('role' in obj) || obj.role == null || obj.role == undefined) {
                    console.log("THIS SHOULD NEVER HAPPEN, UPON JOINING A ROOM PEOPLE HAVE TO RECEIVE THE DEFAULT ROLE");
                    continue;
                }

                if (role == "ALL_ROLES" || obj.role == role) {
                    obj[key] = value;
                    console.log("Set " + key + " of " + UUID + " to " + value);
                    if(UUID == undefined)
                        {
                            console.log("OMGOMGOMGOMGOMG 6");
                        }
                }


            }
        }
    }


    sendToPlayer(UUID, msgType, msg) {

        if (!(UUID in this.UUIDSocketMap)) {
            console.log("Can't send message of type " + msgType + " with content " + msg + " to user " + UUID);
            return;
        }

        console.log("Sent message of type " + msgType + " with content " + msg + " to user " + UUID);
        this.UUIDSocketMap[UUID].emit(msgType, msg);
    }



    broadcastPlayerData() {
        //on client, we just need to iterate over all UUID objects inside to get the names and stuff
        this.socket.emit('player_data_update', this.playerData);
    }


    resetTimers() {
        clearTimeout(this.timeoutObject);
        clearTimeout(this.intervalTimer);
        this.secondCount = 0;
    }


    setTimersForCurrentPhase() {
        var phaseTime = this.phaseTimeouts[this.currentPhaseString()];
        this.timeoutObject = setTimeout(this.nextPhase.bind(this), phaseTime * 1000);
        this.secondCount = phaseTime - 1;
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 1000);
    }


    //This initializes the special roles according to this.roleConfig
    initSpecialRoles()
    {
        //TODO: for each random role, draw a player from a shuffled list of UUIDs and assign it to them, then remove from the list. If list empty -> done
        console.log("Initializing roles!");
        //shuffle function, is only needed here
        function shuffle(array) {
            var currentIndex = array.length, temporaryValue, randomIndex;
          
            // While there remain elements to shuffle...
            while (0 !== currentIndex) {
          
              // Pick a remaining element...
              randomIndex = Math.floor(Math.random() * currentIndex);
              currentIndex -= 1;
          
              // And swap it with the current element.
              temporaryValue = array[currentIndex];
              array[currentIndex] = array[randomIndex];
              array[randomIndex] = temporaryValue;
            }
          
            return array;
          }

        //Create array of UUIDs:
        var UUIDList = [];
        for (var UUID in this.playerData) {
            if(UUID == undefined)
                {
                    console.log("OMGOMGOMGOMGOMG 2");
                }
            if (this.playerData.hasOwnProperty(UUID)) {
                UUIDList.push(UUID);
                console.log("Adding UUID " + UUID + " to role assignment!");
            }
        }

        //Randomize
        UUIDList = shuffle(UUIDList);


        //this.printAllUUIDS();
        //foreach role in this.roleConfig
        for (var role in this.roleConfig) {
            if (this.roleConfig.hasOwnProperty(role)) {

                //Example:
                //role == "Werewolf", this.roleConfig[role] == 2

                //Iterate over number of roles
                for(var numRole = 0; numRole < this.roleConfig[role]; numRole++)
                    {
                        if(UUIDList.length == 0)
                            {
                                console.log("All players have roles, stopping now!");
                                //this.printAllUUIDS();
                                return;
                            }
        
                        //Get random player
                        var playerUUID = UUIDList.pop();

                        if(playerUUID == undefined)
                            {
                                console.log("OMGOMGOMGOMGOMG 3");
                            }
        
                        this.playerData[playerUUID].role = role;
                        console.log("Set role of " + playerUUID + " to " + role);
                        //this.printAllUUIDS();
                    }

                
            }
        }

    }

    startGame() {

        //iterate over all things in playerData and check if everyone is ready.
        var any_data = false;

        var not_all_connected_error = function () {
            console.log('Cannot start game, not all players are ready!');
        }

        for (var UUID in this.playerData) {
            if(UUID == undefined)
                {
                    console.log("OMGOMGOMGOMGOMG 4");
                }
            any_data = true;
            if (this.playerData.hasOwnProperty(UUID)) {

                var obj = this.playerData[UUID];

                if (!('ready' in obj) || obj.ready == 0 || obj.ready == null || obj.ready == undefined) {
                    not_all_connected_error();
                    return;
                }
            }
            else {
                not_all_connected_error();
                return;
            }
        }

        if (any_data == false) {
            not_all_connected_error();
            return;
        }

        //TODO/DONE: assign roles using some configurable settings object in class (using sensible default values)
        this.initSpecialRoles();

        this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');

        

        //night start
        //TODO: use something else, keeping this index feels lame
        //this.currentPhase = 0;

        //schedule timeout for this phase.
        //the server has to check what to do for each phase in case people haven't voted yet or something.
        //important: if all people have voted before the timeout ends, we *need* to clear it
        //using clearTimeout(...)

        //Do necessary starting stuff, set gamePhase for display in client, broadcast all an enable timer.
        this.startPhase(this.currentPhaseString())


        //NOTE: these things are at the end of "startPhase" now.
        //this.setDataKeyForeachRole("gamePhase", this.currentPhaseString(), "ALL_ROLES");

        //Send player Data which might have been updated (death flags, canVote...)
        //this.broadcastPlayerData();

        //run timeout for this phase again. 
        //this.setTimersForCurrentPhase();
    }



    //This timer just runs every second to provide a timer for the clients. Does not need to be very accurate.
    timerUpdate() {
        console.log("Timer Update: " + this.secondCount);
        this.socket.emit('time_update', this.secondCount--);
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 1000);
    }

    handleDayVote(UUID, msg) {
        console.log("UUID " + UUID + " voted during Day! " + msg.voteUUID);
        //console.log("BEFORE CHANGE IN HANDLEDAY");
        //this.printAllUUIDS();
        
        this.changePlayerDataKeyValue(UUID, "currentVote", msg.voteUUID);
        //console.log("AFTER CHANGE IN HANDLEDAY");
        //this.printAllUUIDS();
        
    }

    handleWerewolvesVote(UUID, msg) {
        console.log("UUID " + UUID + " voted during Werewolves! " + msg.voteUUID);
        //console.log("BEFORE CHANGE IN HANDLEWERE");
        //this.printAllUUIDS();
        this.changePlayerDataKeyValue(UUID, "currentVote", msg.voteUUID);
        //console.log("AFTER CHANGE IN HANDLEWERE");
        //this.printAllUUIDS();
    }

    handleUnknownVote(phase, UUID, msg) {
        console.log("Voting during phase " + phase + " not implemented! " + UUID + " " + msg.voteUUID);
    }

    handleVote(UUID, msg) {
        //handleVote should be for user votes, e.g. picking a target during werewolf phase, killing townspeople at the end of the Day...
        //witch choosing a target...
        //for now, I'll implement just Werewolves vs. townspeople, so only Day/Werewolves alternating for now.

        //check if the client is even allowed to vote
        this.checkAndCreateUUID(UUID);

        if (this.playerData[UUID].canVote == 0) {
            console.log("Player " + UUID + " is not allowed to vote!");
            return;
        }

        switch (this.currentPhaseString()) {
            case "Day":
                this.handleDayVote(UUID, msg);
                break;
            case "Werewolves":
                this.handleWerewolvesVote(UUID, msg);
                break;

            default:
                this.handleUnknownVote(this.currentPhaseString(), UUID, msg);
                break;
        }
    }

    startPhase(phase) {
        //TODO: do stuff at the start of a given phase. (whatever that might be)
        console.log("Handling startPhase: " + phase);
        switch (phase) {
            case "Day":
                console.log("Day starting, enabling votes for all");
                this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');
                this.setDataKeyForeachRole('canVote', 1, 'ALL_ROLES');
                break;
            case "Werewolves":
                console.log("Werewolves starting, enabling votes for them, disabling all others");
                this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');
                this.setDataKeyForeachRole('canVote', 1, 'Werewolf');
                break;

            default:
                break;
        }


        this.setDataKeyForeachRole("gamePhase", this.currentPhaseString(), "ALL_ROLES");
        this.setDataKeyForeachRole("currentVote", "", "ALL_ROLES");

        //Send player Data which might have been updated (death flags, canVote...)
        this.broadcastPlayerData();

        //run timeout for this phase again. 
        this.setTimersForCurrentPhase();
    }

    endPhase(phase) {
        //TODO: do stuff at the end of a given phase. (whatever that might be)
        console.log("Handling endPhase: " + phase);
        switch (phase) {
            case "Day":

                break;

            default:
                break;
        }

        this.votes = {};
    }

    nextPhase() {

        //resetTimers: we need this if we call nextPhase normally without timeout (e.g. if all people have voted already)
        //this.printAllUUIDS();
        this.resetTimers();
        //TODO: here we could probably do transition logic for each phase, and send text-to-speech commands to the clients, as well as updated client info (current phase...)
        console.log("Next Phase: Phase " + this.currentPhaseString() + " -> " + this.phases[(this.currentPhase + 1) % this.phases.length]);

        this.endPhase(this.currentPhaseString())
        //this.printAllUUIDS();

        //Switch to next phase
        this.currentPhase++;
        if (this.currentPhase >= this.phases.length) {
            this.currentPhase = 0;
        }


        this.startPhase(this.currentPhaseString())
        //this.printAllUUIDS();

    }

}

module.exports = GamePhaseHandler;
