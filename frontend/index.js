window.newgame = async () => {
    const url = `/api/creategame`;

    const playerNum = parseInt(document.getElementById('players').value);
    const gameWidth = parseInt(document.getElementById('width').value);
    const gameHeight = parseInt(document.getElementById('height').value);

    const response = await (await fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({players: playerNum, width: gameWidth, height: gameHeight})
    })).json();

    window.location = `/game/index.html?id=${encodeURIComponent(response.id)}`;
}

window.join = () => {
    const id = document.getElementById("gameid").value.trim();

    window.location = `/game/index.html?id=${encodeURIComponent(id)}`;
}

document.getElementById("gameid").addEventListener("keyup", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === "Enter")
        document.getElementById("joingame").click();
});