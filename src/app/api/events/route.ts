import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

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

export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      connections.add(controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000); // 30 second heartbeat

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
