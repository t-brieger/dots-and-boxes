module.exports = class GameController {
    gameId;
    width;
    height;
    playerNum;
    players;
    doaTimer;
    dead;

    turn;

    grid;
    finishedSquares;

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

        this.grid = [];
        this.finishedSquares = [];
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

        response.lines = this.grid;

        response.finished = this.finishedSquares;

        which.send(JSON.stringify(response));
    }

    isValidLine(fromX, toX, fromY, toY, sender) {
        if (this.turn !== this.players.indexOf(sender))
            return false;
        if (parseInt(fromX) !== fromX || parseInt(fromY) !== fromY || parseInt(toX) !== toX || parseInt(toY) !== toY)
            return false;
        if (fromX - toX + fromY - toY === 0)
            return false;
        if (!(toX - fromX === 1 || toY - fromY === 1))
            return false;
        if (toX - fromX + toY - fromY !== 1)
            return false;
        if (fromX < 0 || toX >= this.width || fromY < 0 || toY >= this.height)
            return false;

        return this.grid.filter(l => l.from[0] === fromX && l.to[0] === toX && l.from[1] === fromY && l.to[1] === toY).length === 0;


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

        ws.pingInterval = setInterval(() => {
            if (Date.now() - ws.lastPong >= 3000) {
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
        }, 1000);

        ws.on('message', d => this.onMessage(ws, d));
    }

    onMessage(ws, data) {
        // none of our data will be binary - the payloads are so small that they might as well not be for convenience.
        data = data.toString();

        if (data === 'pong')
            return ws.lastPong = Date.now();

        data = JSON.parse(data);

        console.log("received:", JSON.stringify(data, null, 2));

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

        if (data.type === 'turn') {
            let {from: [fromX, fromY], to: [toX, toY]} = data;

            [fromX, toX] = [Math.min(fromX, toX), Math.max(fromX, toX)];
            [fromY, toY] = [Math.min(fromY, toY), Math.max(fromY, toY)];

            if (this.isValidLine(fromX, toX, fromY, toY, ws)) {
                console.log(`valid line: (${fromX},${fromY}) -> (${toX},${toY})`);
                this.grid.push({from: [fromX, fromY], to: [toX, toY], by: this.players.indexOf(ws)});

                const oldFinishedLength = this.finishedSquares.length;

                this.finishedSquares = [];
                const squareSides = [];
                for (let x = -1; x < this.width; x++) {
                    squareSides[x] = []
                    for (let y = -1; y < this.height; y++) {
                        squareSides[x][y] = [];
                    }
                }
                for (let i = 0; i < this.grid.length; i++) {
                    const line = this.grid[i];

                    if (line.from[0] === line.to[0]) {
                        // different y
                        squareSides[line.from[0]][line.from[1]].push(line.by);
                        squareSides[line.from[0] - 1][line.from[1]].push(line.by);
                    } else {
                        // different x
                        squareSides[line.from[0]][line.from[1]].push(line.by);
                        squareSides[line.from[0]][line.from[1] - 1].push(line.by);
                    }
                }

                for (let x = 0; x < this.width - 1; x++) {
                    for (let y = 0; y < this.height - 1; y++) {
                        if (squareSides[x][y].length > 4)
                            throw "wtf";
                        if (squareSides[x][y].length === 4)
                            this.finishedSquares.push({by: squareSides[x][y][3], x, y});
                    }
                }

                if (this.finishedSquares.length <= oldFinishedLength)
                    this.turn++;
                this.turn %= this.playerNum;
            }

            this.doForAllClients(w => this.sendState(w));
        }
    }
}