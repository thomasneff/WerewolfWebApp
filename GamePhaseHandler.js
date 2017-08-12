
class GamePhaseHandler {

    /*
        ROLES:

        werewolf,
        townsperson


        ALL_ROLES -> used by setDataKeyForeachRole to change stuff for everyone.
    */

    constructor(socket) {
        //TODO: should "day" and "vote_kill" be separate? In the game, it is, but I think we could also just make it so that voting is enabled the whole day.
        //      but for narration events it might make sense. We can still add them later, however.
        this.phases = ["day", "werewolves"]
        this.currentPhase = 0;
        //this.phaseTimeouts = 3; // for testing, 3 seconds. Should be configurable or 5 minutes or something (300 seconds)
        this.phaseTimeouts = {
            "day": 300,
            "werewolves": 10
        }

        this.config = {
            "numWerewolves": 2,
            "numWitches": 0,
            "numSeer": 0, //etc... Townspeople are always all the remaining players
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


    checkAndCreateUUID(UUID) {
        if (!(UUID in this.playerData)) {
            //make new object for UUID if it doesn't exist yet
            //NOTE: here we can also do initialization for new players for internal state variables
            this.playerData[UUID] = { canVote: 0, role: 'townsperson' };
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
        this.checkAndCreateUUID(UUID);

        this.playerData[UUID][key] = value;
        console.log("Player attribute " + key + " changed to " + value + " (UUID: " + UUID + ")");
    }

    addUUIDSocket(UUID, socket) {
        this.UUIDSocketMap[UUID] = socket;
    }

    //This function sets a specific key in playerData for each player of a given role
    //Can be e.g. used to set canVote for Werewolves.
    setDataKeyForeachRole(key, value, role) {
        for (var UUID in this.playerData) {
            if (this.playerData.hasOwnProperty(UUID)) {

                var obj = this.playerData[UUID];


                if (!('role' in obj) || obj.role == null || obj.role == undefined) {
                    console.log("THIS SHOULD NEVER HAPPEN, UPON JOINING A ROOM PEOPLE HAVE TO RECEIVE THE DEFAULT ROLE");
                    continue;
                }

                if (role == "ALL_ROLES" || obj.role == role) {
                    obj[key] = value;
                    console.log("Set " + key + " of " + UUID + " to " + value);
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
        secondCount = 0;
    }


    setTimersForCurrentPhase() {
        var phaseTime = this.phaseTimeouts[this.currentPhaseString()];
        this.timeoutObject = setTimeout(this.nextPhase.bind(this), phaseTime * 1000);
        this.secondCount = phaseTime;
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 1000);
    }

    startGame() {

        //iterate over all things in playerData and check if everyone is ready.
        var any_data = false;

        var not_all_connected_error = function () {
            console.log('Cannot start game, not all players are ready!');
        }

        for (var UUID in this.playerData) {
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

        //TODO: assign roles using some configurable settings object in class (using sensible default values)

        this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');

        //night start
        //TODO: use something else, keeping this index feels lame
        this.currentPhase = 2;

        //schedule timeout for this phase.
        //the server has to check what to do for each phase in case people haven't voted yet or something.
        //important: if all people have voted before the timeout ends, we *need* to clear it
        //using clearTimeout(...)
        this.setTimersForCurrentPhase();
        console.log("Starting Game: Phase " + this.phases[this.currentPhase]);
    }



    //This timer just runs every second to provide a timer for the clients. Does not need to be very accurate.
    timerUpdate() {
        console.log("Timer Update: " + this.secondCount);
        this.socket.emit('time_update', this.secondCount--);
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 1000);
    }

    handleDayVote(UUID, msg) {
        console.log("UUID " + UUID + " voted during day! " + msg.UUID);
    }

    handleWerewolvesVote(UUID, msg) {
        console.log("UUID " + UUID + " voted during werewolves! " + msg.UUID);
    }

    handleUnknownVote(phase, UUID, msg) {
        console.log("Voting during phase " + phase + " not implemented! " + UUID + " " + msg.UUID);
    }

    handleVote(UUID, msg) {
        //handleVote should be for user votes, e.g. picking a target during werewolf phase, killing townspeople at the end of the day...
        //witch choosing a target...
        //for now, I'll implement just werewolves vs. townspeople, so only day/werewolves alternating for now.

        //check if the client is even allowed to vote
        checkAndCreateUUID();

        if (this.playerData[UUID].canVote == 0) {
            console.log("Player " + UUID + " is not allowed to vote!");
            return;
        }

        switch (currentPhaseString()) {
            case "day":
                this.handleDayVote(UUID, msg);
                break;
            case "werewolves":
                this.handleWerewolvesVote(UUID, msg);
                break;

            default:
                this.handleUnknownVote(currentPhaseString(), UUID, msg);
                break;
        }
    }

    startPhase(phase) {
        //TODO: do stuff at the start of a given phase. (whatever that might be)
        console.log("Handling startPhase: " + phase);
        switch (phase) {
            case "day":
                console.log("day starting, enabling votes for all");
                this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');
                this.setDataKeyForeachRole('canVote', 1, 'ALL_ROLES');
                break;
            case "werewolves":
                console.log("Werewolves starting, enabling votes for them, disabling all others");
                this.setDataKeyForeachRole('canVote', 0, 'ALL_ROLES');
                this.setDataKeyForeachRole('canVote', 1, 'werewolf');
                break;

            default:
                break;
        }
    }

    endPhase(phase) {
        //TODO: do stuff at the end of a given phase. (whatever that might be)
        console.log("Handling endPhase: " + phase);
        switch (phase) {
            case "day":

                break;

            default:
                break;
        }

        this.votes = {};
    }

    nextPhase() {

        //resetTimers: we need this if we call nextPhase normally without timeout (e.g. if all people have voted already)
        resetTimers();
        //TODO: here we could probably do transition logic for each phase, and send text-to-speech commands to the clients, as well as updated client info (current phase...)
        console.log("Next Phase: Phase " + currentPhaseString() + " -> " + this.phases[(this.currentPhase + 1) % this.phases.length]);

        this.endPhase(currentPhaseString())


        //Switch to next phase
        this.currentPhase++;
        if (this.currentPhase >= this.phases.length) {
            this.currentPhase = 0;
        }


        this.startPhase(currentPhaseString())

        //run timeout for this phase again. 
        this.setTimersForCurrentPhase();
    }

}

module.exports = GamePhaseHandler;
