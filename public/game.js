const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomId = null;
let players = {};
let myId = null;
let myPlayer = null;
let currentMode = "lobby";
let ownerId = null;

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
  socket.emit("leaveRoom", roomId);
  location.reload();
};

copy.onclick = () => {
  navigator.clipboard.writeText(roomId);
};

colorPicker.addEventListener("input", () => {
  if (roomId) {
    socket.emit("changeColor", {
      roomId,
      color: colorPicker.value
    });
  }
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

socket.on("gameStarted", mode => {
  currentMode = mode;
});

socket.on("roomClosed", () => {
  alert("Sala cerrada");
  location.reload();
});

document.addEventListener("keydown", e => {
  if (!myPlayer) return;

  if (e.key === "w") myPlayer.y -= 5;
  if (e.key === "s") myPlayer.y += 5;
  if (e.key === "a") myPlayer.x -= 5;
  if (e.key === "d") myPlayer.x += 5;

  socket.emit("move", {
    roomId,
    x: myPlayer.x,
    y: myPlayer.y
  });
});

canvas.addEventListener("click", () => {
  if (currentMode !== "shoot" || !myPlayer) return;

  for (const id in players) {
    if (id === myId) continue;

    const p = players[id];
    const dx = p.x - myPlayer.x;
    const dy = p.y - myPlayer.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 200) {
      const damage = Math.max(5, 50 - dist / 4);
      socket.emit("shoot", {
        roomId,
        targetId: id,
        damage
      });
      break;
    }
  }
});

function startGame(mode) {
  socket.emit("startGame", { roomId, mode });
}

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