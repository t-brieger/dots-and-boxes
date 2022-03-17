const http = require('http');

let lobby_id = 0;

const server = http.createServer((req, res) => {
    // oh no
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === '/creategame') {
        res.end(`{"new_id": ${lobby_id++}}`);
    }
    else
    {
        res.statusCode = 404;
        res.end("{}")
    }
});

server.listen(2885, 'localhost', () => {
    console.log("Server Listening.");
});