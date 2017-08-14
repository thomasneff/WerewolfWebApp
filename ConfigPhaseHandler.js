class ConfigPhaseHandler {

    constructor(io, options) {
        
        //This is the whole playerData (UUID -> {name, role(s), img, canVote, ...})
        this.ServerList = [];
        this.PlayerList = [];

        this.ServerPlayerMap={};
    }

    getServerList()
    {
        return ServerList;
    }

    createServer(ServerParams)
    {
        this.ServerList.push(ServerParams);
    }

    getPlayerList(ServerName)
    {
        this.getPlayerList
    }

    joinServer(PlayerData)
    {
        
    }


}

module.exports = ConfigPhaseHandler;