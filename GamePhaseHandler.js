
class GamePhaseHandler {
    constructor(io) {
        this.phases = ["day", "vote_kill", "night_start", "werewolves", "witch"]
        this.currentPhase = 0;
        this.dayTimeoutSeconds = 3; // for testing, 3 seconds. Should be configurable or 5 minutes or something (300 seconds)
        this.timeoutObject = null;
        this.io = io;
        this.intervalTimer = null;
        this.secondCount = 100;
        this.playerData = {};
    }


    checkAndCreateUUID(UUID) {
        if (!(UUID in this.playerData)) {
            //make new object for UUID if it doesn't exist yet
            this.playerData[UUID] = {};
        }
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



    broadcastPlayerData() {
        //on client, we just need to iterate over all UUID objects inside to get the names and stuff
        this.io.emit('player_data_update', this.playerData);
    }

    startGame() {

        //iterate over all things in playerData and check if everyone is ready.
        var any_data = false;

        var not_all_connected_error = function () {
            console.log('Cannot start game, not all players are ready!');
        }

        for (var key in this.playerData) {
            any_data = true;
            if (this.playerData.hasOwnProperty(key)) {

                var obj = this.playerData[key];

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

        //night start
        //TODO: use something else, keeping this index feels lame
        this.currentPhase = 2;

        //schedule timeout for this phase.
        //the server has to check what to do for each phase in case people haven't voted yet or something.
        //important: if all people have voted before the timeout ends, we *need* to clear it
        //using clearTimeout(...)
        this.timeoutObject = setTimeout(this.nextPhase.bind(this), this.dayTimeoutSeconds * 1000);
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 5000);
        console.log("Starting Game: Phase " + this.phases[this.currentPhase]);
    }

    timerUpdate() {
        console.log("Timer Update: " + this.secondCount);
        this.io.emit('time_update', this.secondCount--);
        this.intervalTimer = setTimeout(this.timerUpdate.bind(this), 5000);
    }

    handleDayEvent(sender, messageType) {
        console.log("Handling stuff during day!");
    }

    handleUnknownEvent(phase, sender, messageType) {
        console.log("Phase " + phase + " not known! " + sender + " " + messageType);
    }

    handleEvent(sender, messageType) {
        //handleEvent should be for user interaction, e.g. picking a target during werewolf phase, killing townspeople at the end of the day...
        switch (this.phases[this.currentPhase]) {
            case "day":
                this.handleDayEvent(sender, messageType);
                break;

            default:
                this.handleUnknownEvent(this.phases[this.currentPhase], sender, messageType);
                break;
        }
    }

    startPhase(phase) {
        //TODO: do stuff at the start of a given phase. (whatever that might be)
        console.log("Handling startPhase: " + phase);
        switch (phase) {
            case "day":

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
    }

    nextPhase() {

        console.log("Test");
        //TODO: here we could probably do transition logic for each phase, and send text-to-speech commands to the clients, as well as updated client info (current phase...)
        console.log("Next Phase: Phase " + this.phases[this.currentPhase] + " -> " + this.phases[(this.currentPhase + 1) % this.phases.length]);

        this.endPhase(this.phases[this.currentPhase])


        this.currentPhase++;
        if (this.currentPhase >= this.phases.length) {
            this.currentPhase = 0;
        }


        this.startPhase(this.phases[this.currentPhase])

        //run timeout for this phase again. 
        this.timeoutObject = setTimeout(this.nextPhase.bind(this), this.dayTimeoutSeconds * 1000);
    }

}

module.exports = GamePhaseHandler;
