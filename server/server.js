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
    
    // Solo al creador le enviamos roomCreated
    socket.emit("roomCreated", { 
      roomId, 
      owner: socket.id 
    });
    
    // A todos en la sala les enviamos updatePlayers
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
    
    // IMPORTANTE: Enviar evento joinedRoom al jugador que se unió
    socket.emit("joinedRoom", {
      roomId: roomId,
      ownerId: rooms[roomId].owner // Enviar el ID del owner
    });
    
    // Notificar a TODOS en la sala sobre el nuevo jugador
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("move", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) {
      console.log(`Movimiento rechazado: ${socket.id} no está en sala ${roomId}`);
      return;
    }

    console.log(`Movimiento de ${socket.id} en sala ${roomId}: x=${x}, y=${y}`);
    
    // Actualizar posición
    room.players[socket.id].x = x;
    room.players[socket.id].y = y;
    
    // IMPORTANTE: Cambio aquí - Emitir a TODOS en la sala
    io.to(roomId).emit("updatePlayers", room.players);
  });

  socket.on("changeColor", ({ roomId, color }) => {
    const room = rooms[roomId];
    if (room?.players[socket.id]) {
      console.log(`${socket.id} cambió color a ${color} en sala ${roomId}`);
      room.players[socket.id].color = color;
      io.to(roomId).emit("updatePlayers", room.players);
    }
  });

  socket.on("shoot", ({ roomId, targetId, damage }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players[targetId]) {
      console.log(`${socket.id} disparó a ${targetId} por ${damage} de daño`);
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
            
            // Notificar al nuevo owner
            io.to(newOwner).emit("roomCreated", { 
              roomId, 
              owner: newOwner 
            });
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