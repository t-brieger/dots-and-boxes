(async () => {
    const id = Object.fromEntries(new URLSearchParams(window.location.search).entries()).id;
    const port = (await (await fetch(`http://${process.env.SERVER_URL}:${process.env.API_PORT}/port?id=${encodeURIComponent(id)}`)).json()).port;

    if (port < 0) {
        const errorElem = document.createElement('p');
        errorElem.innerText = "Error: Game expired.";
        document.getElementById('body').appendChild(errorElem);
        return;
    }

    const svgCanvas = document.getElementById('svgCanvas');
    svgCanvas.style.display = 'initial';

    const sock = new WebSocket(`ws://${process.env.SERVER_URL}:${port}`);

    sock.addEventListener('open', () => {
        console.log("connected");
    });
    sock.addEventListener('message', e => {
        console.log(`received from server: ${e.data}`);
        if (e.data === 'ping')
            sock.send('pong');
    });

    console.log(port);
})();