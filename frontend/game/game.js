(async () => {
    const id = Object.fromEntries(new URLSearchParams(window.location.search).entries()).id;
    const {
        port,
        width,
        height,
        players
    } = await (await fetch(`http://${process.env.SERVER_URL}:${process.env.API_PORT}/info?id=${encodeURIComponent(id)}`)).json();

    if (port < 0) {
        const errorElem = document.createElement('p');
        errorElem.innerText = "Error: Game expired.";
        document.getElementById('body').appendChild(errorElem);
        return;
    }

    const playerNames = [];
    for (let i = 0; i < players; i++) {
        playerNames.push(document.createElement('li'))
        playerNames[i].innerText = "No Player yet."
        document.getElementById("playerlist").appendChild(playerNames[i]);
    }

    const svgCanvas = document.getElementById('svgCanvas');
    svgCanvas.style.display = 'initial';

    const sock = new WebSocket(`ws://${process.env.SERVER_URL}:${port}`);

    sock.addEventListener('open', () => {
        console.log("connected");
        sock.send(JSON.stringify({type: "getplayers"}));
    });
    sock.addEventListener('message', e => {
        if (e.data === 'ping')
            return sock.send('pong');

        e.json = JSON.parse(e.data);
        console.log(`received from server:`, e.json)

        if (e.json.type === 'playernames') {
            for (let i = 0; i < e.json.names.length; i++) {
                if (e.json.names[i] === null)
                    playerNames[i].innerText = "No Player " + (i + 1);
                else
                    playerNames[i].innerText = e.json.names[i];

                if (e.json.you === i)
                    playerNames[i].innerText += " (you)";
            }
        }
    });

    document.getElementById('changename').addEventListener('click', () => {
        sock.send(JSON.stringify({
            type: "changename",
            newname: document.getElementById('namechange').value
        }));
    });

    console.log(port);
})();

document.getElementById("namechange").addEventListener("keyup", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === "Enter")
        document.getElementById("changename").click();
});