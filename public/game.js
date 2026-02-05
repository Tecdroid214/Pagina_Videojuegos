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

// Variable para rastrear si estoy en una sala
let inRoom = false;

// Variable para el nombre del jugador
let playerName = "Jugador";

// Obtener el input del nombre
const playerNameInput = document.getElementById("playerName");

// Actualizar nombre cuando se escribe
playerNameInput.addEventListener("input", () => {
  playerName = playerNameInput.value.trim() || "Jugador";
});

socket.on("connect", () => {
  myId = socket.id;
  console.log("Conectado con ID:", myId);
});

create.onclick = () => {
  const color = colorPicker.value;
  const name = playerNameInput.value.trim() || "Jugador";
  console.log("Creando sala con color:", color, "y nombre:", name);
  socket.emit("createRoom", { color, name });
};

join.onclick = () => {
  const color = colorPicker.value;
  const name = playerNameInput.value.trim() || "Jugador";
  const roomToJoin = roomInput.value.trim();
  
  console.log("Intentando unirse a sala:", roomToJoin, "con color:", color, "y nombre:", name);
  
  if (!roomToJoin) {
    alert("Ingresa un ID de sala");
    return;
  }
  
  socket.emit("joinRoom", {
    roomId: roomToJoin,
    color: color,
    name: name
  });
};

leave.onclick = () => {
  socket.emit("leaveRoom", roomId);
  location.reload();
};

copy.onclick = () => {
  navigator.clipboard.writeText(roomId);
  alert("ID copiado al portapapeles!");
};

colorPicker.addEventListener("input", () => {
  if (roomId && myId && inRoom) {
    console.log("Cambiando color a:", colorPicker.value);
    socket.emit("changeColor", {
      roomId,
      color: colorPicker.value
    });
  }
});

// Evento cuando la sala es creada (solo para el creador)
socket.on("roomCreated", data => {
  roomId = data.roomId;
  ownerId = data.owner;
  inRoom = true;
  
  room.hidden = false;
  document.getElementById("roomId").textContent = roomId;
  console.log("Sala creada:", roomId, "Yo soy el owner:", ownerId);
});

// Evento cuando un jugador se une exitosamente a una sala
socket.on("joinedRoom", data => {
  roomId = data.roomId;
  ownerId = data.ownerId; // Ahora recibimos el ownerId
  inRoom = true;
  
  room.hidden = false;
  document.getElementById("roomId").textContent = roomId;
  console.log("Unido a sala:", roomId, "Owner es:", ownerId);
});

socket.on("updatePlayers", data => {
  players = data;
  console.log("Jugadores actualizados. Mi ID:", myId, "Players:", players);
  
  // Verificar si estoy en la lista de jugadores
  if (!players[myId]) {
    console.log("ADVERTENCIA: No estoy en la lista de jugadores aún");
    return;
  }
  
  // Mostrar opción de iniciar juego solo si hay al menos 2 jugadores y soy el owner
  if (Object.keys(players).length >= 2 && myId === ownerId) {
    gameSelect.hidden = false;
    console.log("Mostrando botón de iniciar juego - Soy el owner");
  } else {
    gameSelect.hidden = true;
  }
  
  // Mostrar información de debug en pantalla
  drawDebugInfo();
});

socket.on("errorMsg", (msg) => {
  alert(msg);
  console.error("Error del servidor:", msg);
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
  if (!inRoom) return;
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  if (!inRoom) return;
  keys[e.key.toLowerCase()] = false;
});

// Función de movimiento optimizada
function updateMovement() {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_RATE || !roomId || !inRoom || !players[myId]) {
    return;
  }
  
  let moved = false;
  const player = players[myId];
  const speed = 15;
  
  // Copiar la posición actual
  let newX = player.x;
  let newY = player.y;
  
  // Actualizar posición basada en teclas presionadas
  if (keys["w"] || keys["arrowup"]) {
    newY -= speed;
    moved = true;
  }
  if (keys["s"] || keys["arrowdown"]) {
    newY += speed;
    moved = true;
  }
  if (keys["a"] || keys["arrowleft"]) {
    newX -= speed;
    moved = true;
  }
  if (keys["d"] || keys["arrowright"]) {
    newX += speed;
    moved = true;
  }
  
  // Limitar movimiento dentro del canvas
  newX = Math.max(0, Math.min(canvas.width - 30, newX));
  newY = Math.max(0, Math.min(canvas.height - 30, newY));
  
  // Solo emitir si hubo movimiento
  if (moved && (newX !== player.x || newY !== player.y)) {
    console.log("Emitting move to:", roomId, "Position:", newX, newY);
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
    console.log("Iniciando juego en modo:", mode);
    socket.emit("startGame", { roomId, mode });
  } else {
    console.log("No puedo iniciar juego. OwnerId:", ownerId, "MyId:", myId);
  }
}

function drawDebugInfo() {
  // Esta función dibujará información de debug en el canvas
  // Puedes removerla en producción
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText(`Mi ID: ${myId ? myId.substring(0, 8) : 'N/A'}`, 10, 20);
  ctx.fillText(`Owner ID: ${ownerId ? ownerId.substring(0, 8) : 'N/A'}`, 10, 40);
  ctx.fillText(`Soy owner: ${myId === ownerId ? 'Sí' : 'No'}`, 10, 60);
  ctx.fillText(`Jugadores: ${Object.keys(players).length}`, 10, 80);
  ctx.fillText(`En sala: ${inRoom ? 'Sí' : 'No'}`, 10, 100);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar fondo
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar a todos los jugadores
  for (const id in players) {
    const p = players[id];
    
    // Dibujar cuerpo del jugador
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 30, 30);
    
    // Dibujar borde para identificar jugadores
    if (id === myId) {
      // Jugador local - borde amarillo
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - 2, p.y - 2, 34, 34);
    } else if (id === ownerId) {
      // Owner - borde verde
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, 30, 30);
    }
    
    // Dibujar información del jugador
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    
    // Nombre del jugador (si existe) o ID abreviado
    let displayName = p.name || id.substring(0, 5);
    
    // Si el nombre es muy largo, acortarlo
    if (displayName.length > 10) {
      displayName = displayName.substring(0, 10) + "...";
    }
    
    // Dibujar nombre arriba del cubo
    ctx.fillStyle = "white";
    ctx.fillText(displayName, p.x + 15, p.y - 10);
    
    // HP debajo del cubo
    ctx.fillStyle = "#ff4444";
    ctx.font = "10px Arial";
    ctx.fillText(`HP: ${p.hp}`, p.x + 15, p.y + 45);
    
    // Si soy el owner, mostrar "(Owner)"
    if (id === ownerId) {
      ctx.fillStyle = "#00ff00";
      ctx.font = "9px Arial";
      ctx.fillText("(Owner)", p.x + 15, p.y + 60);
    }
  }
  
  // Dibujar información de debug
  drawDebugInfo();
}

// Bucle principal del juego
function gameLoop() {
  updateMovement();
  draw();
  requestAnimationFrame(gameLoop);
}

// Iniciar bucle del juego
gameLoop();