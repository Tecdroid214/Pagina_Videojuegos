const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomId = null;
let players = {};
let myId = null;
let ownerId = null;

// POSICIÓN LOCAL (CLAVE)
let localX = 400;
let localY = 300;

const input = { up:false, down:false, left:false, right:false };

socket.on("connect", () => {
  myId = socket.id;
});

create.onclick = () => {
  socket.emit("createRoom", colorPicker.value);
};

join.onclick = () => {
  socket.emit("joinRoom", {
    roomId: roomInput.value,
    color: colorPicker.value
  });
};

colorPicker.addEventListener("input", () => {
  socket.emit("changeColor", { color: colorPicker.value });
});

socket.on("roomJoined", data => {
  roomId = data.roomId;
  ownerId = data.owner;
  room.hidden = false;
  document.getElementById("roomId").textContent = roomId;
});

socket.on("updatePlayers", data => {
  players = data;

  // sincroniza solo si existe
  if (players[myId]) {
    localX = players[myId].x;
    localY = players[myId].y;
  }
});

// INPUT
document.addEventListener("keydown", e => {
  if (e.key === "w") input.up = true;
  if (e.key === "s") input.down = true;
  if (e.key === "a") input.left = true;
  if (e.key === "d") input.right = true;
});

document.addEventListener("keyup", e => {
  if (e.key === "w") input.up = false;
  if (e.key === "s") input.down = false;
  if (e.key === "a") input.left = false;
  if (e.key === "d") input.right = false;
});

// MOVIMIENTO ESTABLE
setInterval(() => {
  if (!roomId) return;

  if (input.up) localY -= 5;
  if (input.down) localY += 5;
  if (input.left) localX -= 5;
  if (input.right) localX += 5;

  socket.emit("move", { x: localX, y: localY });
}, 50);

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
  }

  requestAnimationFrame(draw);
}

draw();