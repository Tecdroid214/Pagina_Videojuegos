const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const colorPicker = document.getElementById("colorPicker");

let players = {};
let myId = null;
let myPlayer = null;
let roomId = null;

// INPUTS
let input = { up:false, down:false, left:false, right:false };

createBtn.onclick = () => {
  roomId = roomInput.value;
  socket.emit("createRoom", roomId);
};

joinBtn.onclick = () => {
  roomId = roomInput.value;
  socket.emit("joinRoom", roomId);
};

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("updatePlayers", data => {
  players = data;
  myPlayer = players[myId];
});

// MOVIMIENTO SIN TEMBLOR
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

setInterval(() => {
  if (!myPlayer || !roomId) return;

  let nx = myPlayer.x;
  let ny = myPlayer.y;

  if (input.up) ny -= 5;
  if (input.down) ny += 5;
  if (input.left) nx -= 5;
  if (input.right) nx += 5;

  socket.emit("move", { roomId, x: nx, y: ny });
}, 50);

// COLOR EN TIEMPO REAL
colorPicker.addEventListener("input", () => {
  if (!roomId) return;
  socket.emit("changeColor", {
    roomId,
    color: colorPicker.value
  });
});

// RENDER CORRECTO (todos se mueven bien)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
  }

  requestAnimationFrame(draw);
}

draw();