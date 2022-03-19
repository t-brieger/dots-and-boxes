(async () => {
    const id = Object.fromEntries(new URLSearchParams(window.location.search).entries()).id;
    const {
        width, height, players, error
    } = await (await fetch(`/api/info/${encodeURIComponent(id)}`)).json();

    if (error) {
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

    document.getElementById('actualbody').style.display = 'initial';
    const svgCanvas = document.getElementById('svgcanvas');

    const sock = new WebSocket((window.location.protocol === 'https:' ? 'wss' : 'ws') +
        `://${window.location.host}/game/${encodeURIComponent(id)}`);

    sock.addEventListener('open', () => {
        console.log("connected");
        sock.send(JSON.stringify({type: "getplayers"}));
    });

    sock.addEventListener('message', e => {
        if (e.data === 'ping') return sock.send('pong');

        e.json = JSON.parse(e.data);
        console.log(`received from server:`, e.json)

        if (e.json.type === 'playernames') {
            for (let i = 0; i < e.json.names.length; i++) {
                if (e.json.names[i] === null)
                    playerNames[i].innerText = "No Player " + (i + 1);
                else
                    playerNames[i].innerText = e.json.names[i];

                if (e.json.you === i) playerNames[i].innerText += " (you)";
            }
        }
    });

    document.getElementById('changename').addEventListener('click', () => {
        sock.send(JSON.stringify({
            type: "changename", new_name: document.getElementById('namechange').value
        }));
    });
})();

document.getElementById("namechange").addEventListener("keyup", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === "Enter") document.getElementById("changename").click();
});