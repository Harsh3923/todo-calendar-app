import { io } from "socket.io-client";
import { getToken } from "./api/client.js";

const SOCKET_URL = "http://localhost:8080";

let socket = null;

/** Connect (or reuse an existing connection) for the current user. */
export function connectSocket() {
  if (socket?.connected) return socket;

  const token = getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket connection error:", err.message);
  });

  return socket;
}

/** Disconnect and clear the singleton (call on logout). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Get the current socket instance without connecting. */
export function getSocket() {
  return socket;
}
