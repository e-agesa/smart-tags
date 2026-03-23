import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app";
import { env } from "./config/env";
import * as chatService from "./services/chat.service";

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// Socket.io for real-time chat
io.on("connection", (socket) => {
  // Join a chat room (finder or owner)
  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);
  });

  // Send message
  socket.on("send_message", async (data: {
    room_id: string;
    finder_token?: string;
    sender_role: "finder" | "owner";
    body: string;
  }) => {
    try {
      // Validate the room exists
      if (data.finder_token) {
        const room = await chatService.getChatRoomByToken(data.finder_token);
        if (!room || room.id !== data.room_id) return;
      }

      const message = await chatService.addMessage(
        data.room_id,
        data.sender_role,
        data.body
      );

      // Broadcast to room
      io.to(data.room_id).emit("new_message", message);
    } catch (err) {
      console.error("Chat message error:", err);
    }
  });

  socket.on("disconnect", () => {
    // cleanup if needed
  });
});

// Export io for use in routes if needed
export { io };

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`Scan pages: ${env.BASE_URL}/s/<tagCode>`);
});
