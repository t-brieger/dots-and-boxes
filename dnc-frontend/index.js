window.newgame = async () => {
    const url = `${process.env.SERVER_URL}/creategame`;
    const response = await (await fetch(url)).json();
    console.log(response);
}

window.join = () => {
    const id = document.getElementById("gameid").value.trim();
    alert(id);
}

document.getElementById("gameid").addEventListener("keyup", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === "Enter")
        document.getElementById("joingame").click();
});