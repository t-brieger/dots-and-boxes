const http = require('http');
const { fork } = require('child_process');

const { Game } = require('./game');

let last_lobby = 0;

const gamesInProgress = {};

const server = http.createServer((req, res) => {
    // oh no
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === '/creategame') {
        const ourLobbyId = last_lobby;

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

        const controller = new AbortController();
        g.abort = controller.abort;
        g.sub = fork(`${__dirname}/Game/GameController.js`, [`${ourLobbyId}`, `${g.port}`], { signal: controller.signal, stdio: 'pipe' });

        g.sub.on('exit', () => {
            delete gamesInProgress[ourLobbyId];
        });

        // g.sub.stdout.on('data', x => console.log(`stdout - ${ourLobbyId} - ${x}`));


        res.end(`{"new_id": ${ourLobbyId}, "port": ${g.port}}`);


        last_lobby++;
    } else {
        res.statusCode = 404;
        res.end("{}");
    }
});

server.listen(2885, 'localhost', () => {
    console.log("Server Listening.");
});