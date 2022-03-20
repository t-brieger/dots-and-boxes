const express = require('express');
const {Parcel} = require('@parcel/core');
const {join} = require("path");
const GameController = require("./Game/GameController");
const {createHash} = require('crypto');

const options = {
    entries: [
        'frontend/index.html',
        'frontend/game/index.html'
    ],
    defaultConfig: '@parcel/config-default',
    mode: process.argv[2] === '--dev' ? 'development' : 'production',
    shouldDisableCache: true
};

let bundler = new Parcel(options);

// noinspection JSIgnoredPromiseFromCall
bundler.run();


const PORT = process.env.PORT || 2885;
const getNextLobbyId = () => {
    return createHash('md5').update(Date.now().toString()).digest('hex');
}

const app = express();
const expressWs = require('express-ws')(app);

const gamesInProgress = {};

app.listen(PORT);

app.use('/api/', (req, res, next) => {
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.setHeader("Content-Type", "application/json");

    next();
});
app.use('/api/', express.json());
app.use(express.static(join(__dirname, 'dist')));

app.ws('/game/:id', (ws, req) => {
    if (gamesInProgress[req.params.id])
        gamesInProgress[req.params.id].onConnection(ws);
    else
        console.log(`invalid connection attempt: ${req.params.id} - possible: ${Object.keys(gamesInProgress).join(",")}`);
});

app.post('/api/creategame', (req, res) => {
    const ourLobbyId = getNextLobbyId();

    console.log('new game: ' + ourLobbyId);

    gamesInProgress[ourLobbyId] = new GameController(ourLobbyId, req.body.width || 3, req.body.height || 3,
        req.body.players || 2, () => delete gamesInProgress[ourLobbyId]);

    res.end(JSON.stringify({id: ourLobbyId}));
});

app.get('/api/info/:id', (req, res) => {
    console.log("info requested: " + req.params.id);
    if (!gamesInProgress[req.params.id])
        return res.end(JSON.stringify({error: "No such game."}));
    const game = gamesInProgress[req.params.id];
    res.end(JSON.stringify({width: game.width, height: game.height, players: game.playerNum}));
});