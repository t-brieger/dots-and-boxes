const svgCanvas = document.getElementById('svgcanvas');
const body = document.getElementById('body');
const previewLine = document.getElementById('preview');
const pointList = document.getElementById('pointslist');
const winner = document.getElementById('winner');
const specList = document.getElementById("speclist");

// CONSTANTS
// (i * golden_ratio) % 1.0
const colours = [
    0.0, 0.618033988749895, 0.23606797749979003, 0.8541019662496852, 0.47213595499958005, 0.09016994374947496,
    0.7082039324993703, 0.3262379212492652, 0.9442719099991601, 0.562305898749055, 0.1803398874989499,
    0.7983738762488448, 0.4164078649987406, 0.03444185374863551, 0.6524758424985304
].map(v => `hsl(${360 * v}, 50%, 50%)`);
console.log(colours);
const pointSize = "0.5"
const percentOfCanvasWithPoints = 85;
// CONSTANTS

const offset = (100 - percentOfCanvasWithPoints) / 2;

const id = Object.fromEntries(new URLSearchParams(window.location.search).entries()).id;

document.getElementById('game_id').innerText = `Game ID: ${id}`;

let width, height, players, error, turn, names, ourIndex;
const playerNames = [];
let spectators = [];
let weAreSpectator;

let closestLine = {type: "turn", from: [0, 0], to: [0, 1]};

let lines = [];
let finished = [];

let linesSvg = [];
let finishedSvg = [];

let pointElements = [];

let sock;

function updateState() {
    for (let i = 0; i < names.length; i++) {
        playerNames[i].innerText = turn === i ? "> " : "  ";
        if (names[i] === null)
            playerNames[i].innerText += "No Player " + (i + 1);
        else
            playerNames[i].innerText += names[i];

        if (ourIndex === i) playerNames[i].innerText += " (you)";

        pointElements[i].innerText = finished.filter(f => f.by === i).length;
        if (names[i] === null)
            pointElements[i].innerText += " Player " + i;
        else
            pointElements[i].innerText += " " + names[i];
    }

    for (let i = 0; i < specList.children.length; )
        specList.removeChild(specList.children[0]);
    for (let i = 0; i < spectators.length; i++) {
        const e = document.createElement('pre');
        e.innerText = spectators[i];
        const f = document.createElement('li');
        f.appendChild(e);
        specList.appendChild(f);
    }

    // turn
    playerNames.forEach((pre, ix) => pre.innerText = (ix === turn ? "> " : "  ") + pre.innerText.substring(2));

    // remove old ones
    for (let i = 0; i < linesSvg.length; i++)
        svgCanvas.removeChild(linesSvg[i]);
    for (let i = 0; i < finishedSvg.length; i++)
        svgCanvas.removeChild(finishedSvg[i]);

    linesSvg = [];

    for (let i = 0; i < lines.length; i++) {
        const lineElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineElement.setAttribute('stroke', colours[lines[i].by % colours.length]);
        lineElement.setAttribute('x1', offset + (percentOfCanvasWithPoints / (width - 1)) * lines[i].from[0]);
        lineElement.setAttribute('x2', offset + (percentOfCanvasWithPoints / (width - 1)) * lines[i].to[0]);
        lineElement.setAttribute('y1', offset + (percentOfCanvasWithPoints / (height - 1)) * lines[i].from[1]);
        lineElement.setAttribute('y2', offset + (percentOfCanvasWithPoints / (height - 1)) * lines[i].to[1]);
        lineElement.setAttribute('stroke-width', '1');
        linesSvg.push(lineElement);
        svgCanvas.appendChild(lineElement);
    }

    finishedSvg = [];

    for (let i = 0; i < finished.length; i++) {
        const fillElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        fillElement.setAttribute('fill', colours[finished[i].by % colours.length]);
        fillElement.setAttribute('opacity', 0.4);
        fillElement.setAttribute('stroke-width', '0');
        fillElement.setAttribute('width', percentOfCanvasWithPoints / (width - 1) - 0.3);
        fillElement.setAttribute('height', percentOfCanvasWithPoints / (height - 1) - 0.3);
        fillElement.setAttribute('x', offset + (percentOfCanvasWithPoints / (width - 1)) * finished[i].x);
        fillElement.setAttribute('y', offset + (percentOfCanvasWithPoints / (height - 1)) * finished[i].y);
        finishedSvg.push(fillElement);
        svgCanvas.appendChild(fillElement);
    }

    if (finished.length === (width - 1) * (height - 1)) {
        let pointNumbers = [];
        for (let i = 0; i < players; i++)
            pointNumbers.push(finished.filter(f => f.by === i).length);
        const maxNum = Math.max(...pointNumbers);
        if (pointNumbers.filter(x => x === maxNum).length !== 1)
            winner.innerText = "Tie!";
        else {
            winner.style.color = colours[pointNumbers.indexOf(Math.max(...pointNumbers)) % colours.length];
            winner.innerText = `${names[pointNumbers.indexOf(Math.max(...pointNumbers))]} Won!`;
        }
        winner.style.display = "initial";
    }
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

        const tmp2 = document.createElement('li');
        const ourPre2 = document.createElement('pre');
        tmp2.appendChild(ourPre2);
        pointElements.push(ourPre2)
        ourPre2.innerText = "0 - Player #" + i;
        ourPre2.style.fontFamily = "monospace";
        ourPre2.style.color = colours[i % colours.length];
        pointList.appendChild(tmp2);
    }

    document.getElementById('actualbody').style.display = 'initial';

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const thisDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            thisDot.setAttribute('cx', ((percentOfCanvasWithPoints / (width - 1)) * x + offset).toString());
            thisDot.setAttribute('cy', ((percentOfCanvasWithPoints / (height - 1)) * y + offset).toString());
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
            ({names, you: ourIndex, spectators} = e.json);
            weAreSpectator = ourIndex < 0;
            updateState();
        }

        if (e.json.type === 'state') {
            ({turn, lines, finished} = e.json);
            updateState();
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

function getClosestLine(x, y) {
    const closestLine = {type: "turn", from: [0, 0], to: [0, 1], d: Infinity}

    for (let pointX = 0; pointX < width; pointX++) {
        for (let pointY = 0; pointY < height; pointY++) {
            let linX, linY, squaredDist;
            if (pointY !== height - 1) {
                linX = offset + (percentOfCanvasWithPoints / (width - 1)) * pointX;
                linY = offset + (percentOfCanvasWithPoints / (height - 1)) * (pointY + 0.5);

                squaredDist = Math.pow(x - linX, 2) + Math.pow(y - linY, 2);
                if (squaredDist < closestLine.d) {
                    closestLine.from = [pointX, pointY];
                    closestLine.to = [pointX, pointY + 1];

                    closestLine.d = squaredDist;
                }
            }
            if (pointX !== width - 1) {
                linX = offset + (percentOfCanvasWithPoints / (width - 1)) * (pointX + 0.5);
                linY = offset + (percentOfCanvasWithPoints / (height - 1)) * pointY;

                squaredDist = Math.pow(x - linX, 2) + Math.pow(y - linY, 2);
                if (squaredDist < closestLine.d) {
                    closestLine.from = [pointX, pointY];
                    closestLine.to = [pointX + 1, pointY];

                    closestLine.d = squaredDist;
                }
            }
        }
    }

    return closestLine;
}

svgCanvas.addEventListener('mousemove', e => {
    if (weAreSpectator)
        return previewLine.style.display = "none";

    const svgPoint = svgCanvas.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const {x, y} = svgPoint.matrixTransform(svgCanvas.getScreenCTM().inverse());
    if (x < 0 || y < 0 || x > 100 || y > 100) {
        previewLine.style.display = "none";
    } else {
        closestLine = getClosestLine(x, y);

        previewLine.setAttribute('x1', closestLine.from[0] * (percentOfCanvasWithPoints / (width - 1)) + offset);
        previewLine.setAttribute('x2', closestLine.to[0] * (percentOfCanvasWithPoints / (width - 1)) + offset);
        previewLine.setAttribute('y1', closestLine.from[1] * (percentOfCanvasWithPoints / (height - 1)) + offset);
        previewLine.setAttribute('y2', closestLine.to[1] * (percentOfCanvasWithPoints / (height - 1)) + offset);

        previewLine.style.display = "initial";
    }
});

svgCanvas.addEventListener('click', e => {
    sock.send(JSON.stringify(closestLine));
})