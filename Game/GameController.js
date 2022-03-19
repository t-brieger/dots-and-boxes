const { WebSocketServer } = require('ws');

const gameId = parseInt(process.argv[2]);
const port = parseInt(process.argv[3]);
const width = parseInt(process.argv[4]);
const height = parseInt(process.argv[5]);
const playerNum = parseInt(process.argv[6]);

const server = new WebSocketServer({ port });

let players = [];

const doaTimer = setTimeout(() => {
    console.log("dead on arrival kek");
    process.exit(1);
}, 3000);

function sendPlayerNames(which) {
    const response = {type: "playernames", names: [], you: players.indexOf(which)}
    for (let i = 0; i < playerNum; i++) {
        if (players.length > i)
            response.names.push(players[i].name);
        else
            response.names.push(null);
    }
    which.send(JSON.stringify(response));
}


server.on('connection', ws => {
    clearTimeout(doaTimer);

    players.push(ws);

    ws.lastPong = Date.now();
    let tempPlayerName = Date.now().toString();
    ws.name = "Player " + tempPlayerName.substring(tempPlayerName.length - 3);

    players.forEach(w => sendPlayerNames(w));

    let pingInterval = setInterval(() => {
        if (Date.now() - ws.lastPong >= 7000) {
            players = players.filter(x => x !== ws);
            players.forEach(w => sendPlayerNames(w));
            if (players.length === 0) {
                console.log("all players unresponsive, exiting");
                process.exit(1);
            }
            clearInterval(pingInterval);
            return;
        }
        ws.send('ping');
    }, 3000);

    ws.on('message', data => {
        // none of our data will be binary - the payloads are so small that they might as well not be for convenience.
        data = data.toString();

        if (data === 'pong')
            return ws.lastPong = Date.now();

        data = JSON.parse(data);

        if (data.type === "changename") {
            ws.name = data.newname;
            players.forEach(w => sendPlayerNames(w));
        }

        if (data.type === "getplayers") {
            sendPlayerNames(ws);
        }


        console.log(`received: ${JSON.stringify(data, null, 2)}`);
    });
});