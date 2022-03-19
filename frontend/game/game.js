const svgCanvas = document.getElementById('svgcanvas');
const body = document.getElementById('body');
const previewLine = document.getElementById('preview');


// CONSTANTS
const colours = ["green", "blue", "red", "black"];
const pointSize = "1"
const percentOfCanvasWithPoints = 85;
// CONSTANTS


const id = Object.fromEntries(new URLSearchParams(window.location.search).entries()).id;

document.getElementById('game_id').innerText = `Game ID: ${id}`;

let width, height, players, error, turn;
const playerNames = [];

let sock;

function updateTurn(newTurnIx) {
    playerNames.forEach((pre, ix) => pre.innerText = (ix === newTurnIx ? "> " : "  ") + pre.innerText.substring(2));
    turn = newTurnIx;
}

(async () => {
    ({width, height, players, error} = await (await fetch(`/api/info/${encodeURIComponent(id)}`)).json());

    if (error) {
        const errorElem = document.createElement('p');
        errorElem.innerText = "Error: Game expired.";
        body.appendChild(errorElem);
        return;
    }

    for (let i = 0; i < players; i++) {
        const tmp = document.createElement('li');
        const ourPre = document.createElement('pre');
        tmp.appendChild(ourPre);
        playerNames.push(ourPre)
        ourPre.innerText = "No Player yet.";
        ourPre.style.fontFamily = "monospace";
        ourPre.style.color = colours[i % colours.length];
        document.getElementById("playerlist").appendChild(tmp);
    }

    document.getElementById('actualbody').style.display = 'initial';

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const thisDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            thisDot.setAttribute('cx', ((percentOfCanvasWithPoints / (width - 1)) * x + ((100 - percentOfCanvasWithPoints) / 2)).toString());
            thisDot.setAttribute('cy', ((percentOfCanvasWithPoints / (height - 1)) * y + ((100 - percentOfCanvasWithPoints) / 2)).toString());
            thisDot.setAttribute('r', pointSize);
            svgCanvas.appendChild(thisDot);
        }
    }

    sock = new WebSocket((window.location.protocol === 'https:' ? 'wss' : 'ws') +
        `://${window.location.host}/game/${encodeURIComponent(id)}`);

    sock.addEventListener('open', () => {
        console.log("connected");
        sock.send(JSON.stringify({type: "getplayers"}));
        sock.send(JSON.stringify({type: "getstate"}))
    });

    turn = -1;

    sock.addEventListener('message', e => {
        if (e.data === 'ping')
            return sock.send('pong');

        e.json = JSON.parse(e.data);
        if (e.json.error)
            throw e.json.error;
        console.log(`received from server:`, e.json)

        if (e.json.type === 'playernames') {
            for (let i = 0; i < e.json.names.length; i++) {
                playerNames[i].innerText = turn === i ? "> " : "  ";
                if (e.json.names[i] === null)
                    playerNames[i].innerText += "No Player " + (i + 1);
                else
                    playerNames[i].innerText += e.json.names[i];

                if (e.json.you === i) playerNames[i].innerText += " (you)";
            }
        }

        if (e.json.type === 'state') {
            const { turn } = e.json;
            updateTurn(turn);
        }
    });
})();

document.getElementById('changename').addEventListener('click', () => {
    sock.send(JSON.stringify({
        type: "changename", new_name: document.getElementById('namechange').value
    }));
});

document.getElementById("namechange").addEventListener("keyup", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === "Enter") document.getElementById("changename").click();
});

svgCanvas.addEventListener('mousemove', e => {
    const svgPoint = svgCanvas.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const {x, y} = svgPoint.matrixTransform(svgCanvas.getScreenCTM().inverse());
    if (x < 0 || y < 0 || x > 100 || y > 100) {
        previewLine.style.display = "none";
    } else {
        const closestLine = {x1: -50, y1: -50, x2: -50, y2: -50, d: Infinity}


        for (let pointX = 0; pointX < width - 1; pointX++) {
            for (let pointY = 0; pointY < height - 1; pointY++) {
                let linX = (100 - percentOfCanvasWithPoints) / 2 + (percentOfCanvasWithPoints / (width - 1)) * pointX;
                let linY = (100 - percentOfCanvasWithPoints) / 2 + (percentOfCanvasWithPoints / (height - 1)) * (pointY + 0.5);

                let squaredDist = Math.pow(x - linX, 2) + Math.pow(y - linY, 2);
                if (squaredDist < closestLine.d) {
                    closestLine.x1 = linX;
                    closestLine.x2 = linX;

                    closestLine.y1 = linY - 0.5 * (percentOfCanvasWithPoints / (height - 1));
                    closestLine.y2 = linY + 0.5 * (percentOfCanvasWithPoints / (height - 1));

                    closestLine.d = squaredDist;
                }

                linX = (100 - percentOfCanvasWithPoints) / 2 + (percentOfCanvasWithPoints / (width - 1)) * (pointX + 0.5);
                linY = (100 - percentOfCanvasWithPoints) / 2 + (percentOfCanvasWithPoints / (height - 1)) * pointY;

                squaredDist = Math.pow(x - linX, 2) + Math.pow(y - linY, 2);
                if (squaredDist < closestLine.d) {
                    closestLine.x1 = linX - 0.5 * (percentOfCanvasWithPoints / (width - 1));
                    closestLine.x2 = linX + 0.5 * (percentOfCanvasWithPoints / (width - 1));

                    closestLine.y1 = linY;
                    closestLine.y2 = linY;

                    closestLine.d = squaredDist;
                }
            }
        }


        previewLine.setAttribute('x1', closestLine.x1);
        previewLine.setAttribute('x2', closestLine.x2);
        previewLine.setAttribute('y1', closestLine.y1);
        previewLine.setAttribute('y2', closestLine.y2);

        previewLine.style.display = "initial";
    }
});