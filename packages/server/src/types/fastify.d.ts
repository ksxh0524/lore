import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
    requestId?: string;
  }
}
