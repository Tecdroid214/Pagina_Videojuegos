const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomId = null;
let players = {};
let x = 300, y = 300;

document.getElementById("create").onclick = () => {
  socket.emit("createRoom", colorPicker.value);
};

document.getElementById("join").onclick = () => {
  socket.emit("joinRoom", {
    roomId: roomInput.value,
    color: colorPicker.value
  });
};

document.getElementById("leave").onclick = () => {
  socket.emit("leaveRoom", roomId);
  location.reload();
};

document.getElementById("copy").onclick = () => {
  navigator.clipboard.writeText(roomId);
};

socket.on("roomCreated", id => {
  roomId = id;
  room.style.display = "block";
  roomIdSpan.textContent = id;
});

socket.on("updatePlayers", data => {
  players = data;
});

socket.on("roomClosed", () => {
  alert("Sala cerrada");
  location.reload();
});

document.addEventListener("keydown", e => {
  if (e.key === "w") y -= 5;
  if (e.key === "s") y += 5;
  if (e.key === "a") x -= 5;
  if (e.key === "d") x += 5;
  socket.emit("move", { roomId, x, y });
});

function draw() {
  ctx.clearRect(0,0,800,600);
  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
    ctx.fillStyle = "white";
    ctx.fillText(p.hp, p.x, p.y - 5);
  }
  requestAnimationFrame(draw);
}

draw();
