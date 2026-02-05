const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

const rooms = {};

function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generar posición aleatoria inicial
function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * 770), // 800 - 30
    y: Math.floor(Math.random() * 570)  // 600 - 30
  };
}

io.on("connection", socket => {
  console.log("Nueva conexión:", socket.id);

  socket.on("createRoom", (color) => {
    const roomId = generateRoomId();
    const position = getRandomPosition();

    rooms[roomId] = {
      owner: socket.id,
      mode: "lobby",
      players: {}
    };

    rooms[roomId].players[socket.id] = {
      x: position.x,
      y: position.y,
      color: color,
      hp: 100
    };

    socket.join(roomId);
    console.log(`Sala ${roomId} creada por ${socket.id}`);
    
    socket.emit("roomCreated", { 
      roomId, 
      owner: socket.id 
    });
    
    // Emitir a TODOS en la sala (incluyendo al creador)
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("joinRoom", ({ roomId, color }) => {
    console.log(`Intentando unir ${socket.id} a sala ${roomId}`);
    
    if (!rooms[roomId]) {
      socket.emit("errorMsg", "Sala no encontrada");
      return;
    }
    
    if (Object.keys(rooms[roomId].players).length >= 4) {
      socket.emit("errorMsg", "Sala llena");
      return;
    }
    
    if (rooms[roomId].players[socket.id]) {
      socket.emit("errorMsg", "Ya estás en esta sala");
      return;
    }

    const position = getRandomPosition();
    rooms[roomId].players[socket.id] = {
      x: position.x,
      y: position.y,
      color: color,
      hp: 100
    };

    socket.join(roomId);
    console.log(`${socket.id} se unió a sala ${roomId}`);
    
    // Notificar a TODOS en la sala sobre el nuevo jugador
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("move", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) {
      console.log(`Movimiento rechazado: ${socket.id} no está en sala ${roomId}`);
      return;
    }

    // Actualizar posición
    room.players[socket.id].x = x;
    room.players[socket.id].y = y;
    
    // Emitir a TODOS los jugadores en la sala (excepto al que se movió)
    socket.to(roomId).emit("updatePlayers", room.players);
    
    // Emitir solo al jugador que se movió (para mantener sincronización)
    socket.emit("updatePlayers", room.players);
  });

  socket.on("changeColor", ({ roomId, color }) => {
    const room = rooms[roomId];
    if (room?.players[socket.id]) {
      room.players[socket.id].color = color;
      io.to(roomId).emit("updatePlayers", room.players);
      console.log(`${socket.id} cambió color a ${color} en sala ${roomId}`);
    }
  });

  socket.on("shoot", ({ roomId, targetId, damage }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players[targetId]) {
      room.players[targetId].hp -= damage;
      if (room.players[targetId].hp < 0) {
        room.players[targetId].hp = 0;
      }
      io.to(roomId).emit("updatePlayers", room.players);
    }
  });

  socket.on("startGame", ({ roomId, mode }) => {
    if (rooms[roomId]?.owner === socket.id) {
      rooms[roomId].mode = mode;
      io.to(roomId).emit("gameStarted", mode);
      console.log(`Juego iniciado en sala ${roomId} en modo ${mode}`);
    }
  });

  socket.on("leaveRoom", (roomId) => {
    console.log(`${socket.id} dejando sala ${roomId}`);
    
    if (rooms[roomId]) {
      delete rooms[roomId].players[socket.id];
      socket.leave(roomId);

      if (Object.keys(rooms[roomId].players).length === 0) {
        // Si la sala queda vacía, eliminarla
        delete rooms[roomId];
        console.log(`Sala ${roomId} eliminada (vacía)`);
      } else {
        // Si el owner se fue, asignar nuevo owner
        if (rooms[roomId].owner === socket.id) {
          const newOwner = Object.keys(rooms[roomId].players)[0];
          rooms[roomId].owner = newOwner;
          console.log(`Nuevo owner de sala ${roomId}: ${newOwner}`);
          
          // Notificar al nuevo owner
          io.to(newOwner).emit("roomCreated", { 
            roomId, 
            owner: newOwner 
          });
        }
        
        // Notificar a los jugadores restantes
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
    
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
          console.log(`Sala ${roomId} eliminada por desconexión`);
        } else {
          // Si el owner se desconectó, asignar nuevo owner
          if (rooms[roomId].owner === socket.id) {
            const newOwner = Object.keys(rooms[roomId].players)[0];
            rooms[roomId].owner = newOwner;
            console.log(`Nuevo owner de sala ${roomId}: ${newOwner}`);
          }
          
          io.to(roomId).emit("updatePlayers", rooms[roomId].players);
        }
      }
    }
  });

});

server.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});