const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomId = null;
let players = {};
let myId = null;
let currentMode = "lobby";
let ownerId = null;

// Nuevas variables para manejar movimiento
let keys = {};
let lastUpdate = 0;
const UPDATE_RATE = 1000 / 60; // 60 FPS

socket.on("connect", () => {
  myId = socket.id;
  console.log("Conectado con ID:", myId);
});

create.onclick = () => {
  socket.emit("createRoom", colorPicker.value);
};

join.onclick = () => {
  const color = colorPicker.value;
  const roomToJoin = roomInput.value;
  console.log("Intentando unirse a sala:", roomToJoin, "con color:", color);
  socket.emit("joinRoom", {
    roomId: roomToJoin,
    color: color
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
  if (roomId && myId) {
    console.log("Cambiando color a:", colorPicker.value);
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
  console.log("Sala creada:", roomId, "Owner:", ownerId);
});

socket.on("updatePlayers", data => {
  players = data;
  console.log("Jugadores actualizados:", players);
  
  // Mostrar opción de iniciar juego solo si hay al menos 2 jugadores y soy el owner
  if (Object.keys(players).length >= 2 && myId === ownerId) {
    gameSelect.hidden = false;
  } else {
    gameSelect.hidden = true;
  }
});

socket.on("errorMsg", (msg) => {
  alert(msg);
});

socket.on("gameStarted", mode => {
  currentMode = mode;
  console.log("Juego iniciado en modo:", mode);
});

socket.on("roomClosed", () => {
  alert("Sala cerrada");
  location.reload();
});

// Manejo mejorado de teclas
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Función de movimiento optimizada
function updateMovement() {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_RATE || !roomId || !players[myId]) return;
  
  let moved = false;
  const player = players[myId];
  const speed = 5;
  
  // Copiar la posición actual
  let newX = player.x;
  let newY = player.y;
  
  // Actualizar posición basada en teclas presionadas
  if (keys["w"] || keys["ArrowUp"]) {
    newY -= speed;
    moved = true;
  }
  if (keys["s"] || keys["ArrowDown"]) {
    newY += speed;
    moved = true;
  }
  if (keys["a"] || keys["ArrowLeft"]) {
    newX -= speed;
    moved = true;
  }
  if (keys["d"] || keys["ArrowRight"]) {
    newX += speed;
    moved = true;
  }
  
  // Limitar movimiento dentro del canvas
  newX = Math.max(0, Math.min(canvas.width - 30, newX));
  newY = Math.max(0, Math.min(canvas.height - 30, newY));
  
  // Solo emitir si hubo movimiento
  if (moved && (newX !== player.x || newY !== player.y)) {
    socket.emit("move", {
      roomId,
      x: newX,
      y: newY
    });
  }
  
  lastUpdate = now;
}

canvas.addEventListener("click", () => {
  if (currentMode !== "shoot" || !players[myId]) return;

  const myPlayer = players[myId];
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
  if (roomId && myId === ownerId) {
    socket.emit("startGame", { roomId, mode });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
    
    // Dibujar ID del jugador
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(`ID: ${id.substring(0, 5)}`, p.x, p.y - 20);
    ctx.fillText(`HP: ${p.hp}`, p.x, p.y - 5);
    
    // Resaltar al jugador actual
    if (id === myId) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, 30, 30);
    }
  }
}

// Bucle principal del juego
function gameLoop() {
  updateMovement();
  draw();
  requestAnimationFrame(gameLoop);
}

// Iniciar bucle del juego
gameLoop();