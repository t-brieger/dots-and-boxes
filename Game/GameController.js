module.exports = class GameController {
    gameId;
    width;
    height;
    playerNum;
    players = [];
    doaTimer;
    dead;

    constructor(gameId, width, height, playerNum, dead) {
        this.gameId = gameId;
        this.width = width;
        this.height = height;
        this.playerNum = playerNum;
        this.dead = dead;
        this.doaTimer = setTimeout(() => {
            console.log("dead on arrival kek");
            this.dead();
        }, 3000);
    }

    sendPlayerNamesToAll() {
        this.players.forEach(w => this.sendPlayerNames(w));
    }

    sendPlayerNames(which) {
        const response = {type: "playernames", names: [], you: this.players.indexOf(which)}
        for (let i = 0; i < this.playerNum; i++) {
            if (this.players.length > i)
                response.names.push((this.players)[i].name);
            else
                response.names.push(null);
        }
        which.send(JSON.stringify(response));
    }

    onConnection(ws) {
        clearTimeout(this.doaTimer);
        this.players.push(ws);
        ws.lastPong = Date.now();
        ws.name = `Player ${ws.lastPong.toString().substring(ws.lastPong.toString().length - 3)}`;
        this.players.forEach(w => this.sendPlayerNames(w));

        ws.pingInterval = setInterval(() => {
            if (Date.now() - ws.lastPong >= 7000) {
                console.log("dead :(");
                this.players = this.players.filter(x => x !== ws);
                this.players.forEach(w => this.sendPlayerNames(w));
                if (this.players.length === 0) {
                    console.log("all players unresponsive, exiting");
                    this.dead();
                }
                clearInterval(ws.pingInterval);
                return;
            }
            ws.send('ping');
        }, 3000);

        ws.on('message', d => this.onMessage(ws, d));
    }

    onMessage(ws, data) {
        // none of our data will be binary - the payloads are so small that they might as well not be for convenience.
        data = data.toString();

        if (data === 'pong')
            return ws.lastPong = Date.now();

        data = JSON.parse(data);

        if (data.type === 'changename') {
            ws.name = data.new_name;
            this.sendPlayerNamesToAll();
        }

        if (data.type === 'getplayers')
            this.sendPlayerNames(ws);

        console.log(`received: ${JSON.stringify(data, null, 2)}`);
    }
}