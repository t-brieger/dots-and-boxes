const express = require('express');
const { fork } = require('child_process');
const { Game } = require('./game');


const PORT = 2885;
let lastLobby = 0;
const getNextLobbyId = () => {
    // TODO: uuid?
    return lastLobby++;
}

const app = express();

const gamesInProgress = {};

app.listen(PORT);

app.use((req, res, next) => {
    // oh no
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.setHeader("Content-Type", "application/json");

    next();
});
app.use(express.json());

app.post('/creategame', (req, res) => {
    const ourLobbyId = getNextLobbyId();

    const g = new Game();
    gamesInProgress[ourLobbyId] = g;

    for (let p = 8000; p < 8100; p++) {
        if (!Object.values(gamesInProgress).some(v => v.port === p)) {
            g.port = p;
            break;
        }
    }

    if (!g.port) {
        res.statusCode = 500;
        res.end("{}");
        return;
    }

    g.width = req.body.width || 3;
    g.height = req.body.height || 3;
    g.playerCount = req.body.players || 2;

    const controller = new AbortController();
    g.abort = controller.abort;
    g.sub = fork(`${__dirname}/Game/GameController.js`, [`${ourLobbyId}`, `${g.port}`, `${g.width}`, `${g.height}`, `${g.playerCount}`], {
        signal: controller.signal,
        stdio: 'pipe'
    });

    g.sub.on('exit', () => {
        delete gamesInProgress[ourLobbyId];
    });

    g.sub.stdout.on('data', x => console.log(`stdout - ${ourLobbyId} - ${x}`));
    g.sub.stderr.on('data', x => console.log(`stderr - ${ourLobbyId} - ${x}`));


    res.end(JSON.stringify({id: ourLobbyId}));
});

app.get('/info', (req, res) => {
    if (!req.query.id || !gamesInProgress[req.query.id])
        return res.end(JSON.stringify({port: -1}));
    const game = gamesInProgress[req.query.id];
    res.end(JSON.stringify({port: game.port, width: game.width, height: game.height, players: game.playerCount}));
})