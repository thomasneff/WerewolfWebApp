class ConfigPhaseHandler {

    constructor(io, options) {
        
        //This is the whole playerData (UUID -> {name, role(s), img, canVote, ...})
        this.ServerList = [];
        this.UUIDList = [];
        this.PlayerList = [];

        this.ServerPlayerMap={};
    }

    addClient(UUID)
    {
        if(UUID in this.UUIDList)
        {
           return false;
        }
        else
        {
            this.UUIDList.push(UUID);
        }
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