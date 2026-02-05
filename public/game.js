const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomId = null;
let players = {};
let myId = null;
let myPlayer = null;
let currentMode = "lobby";
let ownerId = null;

// INPUT STATE
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

leave.onclick = () => {
  socket.emit("leaveRoom");
  location.reload();
};

copy.onclick = () => {
  navigator.clipboard.writeText(roomId);
};

colorPicker.addEventListener("input", () => {
  socket.emit("changeColor", { color: colorPicker.value });
});

socket.on("roomCreated", data => {
  roomId = data.roomId;
  ownerId = data.owner;
  room.hidden = false;
  document.getElementById("roomId").textContent = roomId;
});

socket.on("updatePlayers", data => {
  players = data;
  myPlayer = players[myId];

  if (Object.keys(players).length >= 2 && myId === ownerId) {
    gameSelect.hidden = false;
  }
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
  if (!myPlayer) return;

  let x = myPlayer.x;
  let y = myPlayer.y;

  if (input.up) y -= 5;
  if (input.down) y += 5;
  if (input.left) x -= 5;
  if (input.right) x += 5;

  socket.emit("move", { x, y });
}, 50);

// DISPAROS (SIN CAMBIOS)
canvas.addEventListener("click", () => {
  if (currentMode !== "shoot" || !myPlayer) return;

  for (const id in players) {
    if (id === myId) continue;

    const p = players[id];
    const dist = Math.hypot(p.x - myPlayer.x, p.y - myPlayer.y);

    if (dist < 200) {
      socket.emit("shoot", {
        targetId: id,
        damage: Math.max(5, 50 - dist / 4)
      });
      break;
    }
  }
});

socket.on("gameStarted", mode => {
  currentMode = mode;
});

socket.on("roomClosed", () => {
  alert("Sala cerrada");
  location.reload();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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