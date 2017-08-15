//Upon request, the server sends this to the client. The client then builds the UI for all the room config options, which get then used by the server when the room is created.

var roomConfig = [
    
          {
            //This could also be initialized from the localization file, but will need more work, as the client will need to choose language at the same time the config is done.
            configName: "Number of Werewolves",
            configNameInternal: "numWerewolves",
            configType: "input",
            initVal: 2
          },
    
          {
            configName: "Timeout in seconds for Phase 'Werewolf'",
            configNameInternal: "phaseTimeWerewolf",
            configType: "input",
            initVal: 10
          },
    
          //...
        ]


module.exports = roomConfig;