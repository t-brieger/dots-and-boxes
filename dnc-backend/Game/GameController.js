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

server.on('connection', ws => {
    clearTimeout(doaTimer);

    players.push(ws);

    ws.lastPong = Date.now();

    let pingInterval = setInterval(() => {
        if (Date.now() - ws.lastPong >= 10000) {
            players = players.filter(x => x !== ws);
            if (players.length === 0) {
                console.log("all players unresponsive, exiting");
                process.exit(1);
            }
            clearInterval(pingInterval);
            return;
        }
        ws.send('ping');
    }, 5000);

    ws.on('message', data => {
        // none of our data will be binary - the payloads are so small that they might as well be json for convenience.
        data = data.toString();

        if (data === 'pong')
            ws.lastPong = Date.now();

        console.log(`received: ${data}`);
    });
});