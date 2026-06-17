export class SocketClient {
  constructor() {
    this.socket = null;
    this.pendingHandlers = [];
  }

  connect() {
    if (this.socket) return this.socket;
    this.socket = window.io();
    for (const [event, handler] of this.pendingHandlers) {
      this.socket.on(event, handler);
    }
    return this.socket;
  }

  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    } else {
      this.pendingHandlers.push([event, handler]);
    }
  }

  off(event, handler) {
    this.socket?.off(event, handler);
  }

  emit(event, payload) {
    this.socket?.emit(event, payload);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketClient = new SocketClient();
