module.exports = class GameController {
    gameId;
    width;
    height;
    playerNum;
    players;
    doaTimer;
    dead;

    turn;

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
        this.players = [];
        for (let i = 0; i < playerNum; i++)
            this.players.push(null);

        this.turn = (Math.random() * playerNum) & 1
    }

    doForAllClients(func) {
        this.players.filter(w => w !== null).forEach(w => func(w));
    }

    sendPlayerNames(which) {
        if (which === null)
            return;
        const response = {type: "playernames", names: [], you: this.players.indexOf(which)}
        for (let i = 0; i < this.playerNum; i++) {
            if (this.players[i] === null) {
                response.names.push(null);
                continue;
            }

            if (this.players.length > i)
                response.names.push(this.players[i].name);
            else
                response.names.push(null);
        }
        which.send(JSON.stringify(response));
    }

    sendState(which) {
        if (which === null)
            return;

        const response = {};
        response.type = 'state';
        response.turn = this.turn;

        which.send(JSON.stringify(response));
    }

    onConnection(ws) {
        if (this.players.indexOf(null) < 0) {
            ws.send(JSON.stringify({error: "Lobby full."}));
            return;
        }
        clearTimeout(this.doaTimer);
        this.players[this.players.indexOf(null)] = ws;
        ws.lastPong = Date.now();
        ws.name = `Player ${ws.lastPong.toString().substring(ws.lastPong.toString().length - 3)}`;
        this.doForAllClients(x => this.sendPlayerNames(x));
        console.log(this.players.filter(p => p !== null).map(p => p.name));

        ws.pingInterval = setInterval(() => {
            if (Date.now() - ws.lastPong >= 7000) {
                console.log("dead :(");
                this.players[this.players.indexOf(ws)] = null;
                this.doForAllClients(x => this.sendPlayerNames(x));
                if (this.players.every(w => w === null)) {
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
            data.new_name = data.new_name.trim().replace('\n', '');
            if (data.new_name.length <= 100 && data.new_name.length !== 0) {
                ws.name = data.new_name;
                this.doForAllClients(x => this.sendPlayerNames(x));
            }
        }

        if (data.type === 'getplayers')
            this.sendPlayerNames(ws);

        if (data.type === 'getstate')
            this.sendState(ws);

        console.log(`received: ${JSON.stringify(data, null, 2)}`);
    }
}