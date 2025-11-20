// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

// Notify all connected clients
export function notifyClients(data: any) {
  connections.forEach((controller) => {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error('Error sending SSE message:', error);
    }
  });
}
