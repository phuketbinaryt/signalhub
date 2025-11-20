import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/lib/sse';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      addConnection(controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          removeConnection(controller);
        }
      }, 30000); // 30 second heartbeat

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(controller);
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
