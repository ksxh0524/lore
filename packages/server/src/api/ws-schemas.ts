import { z } from 'zod';

const MAX_PAYLOAD_SIZE = 10240;

export const WsMessageSchema = z.union([
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('subscribe'), eventTypes: z.array(z.string()).optional() }),
  z.object({ type: z.literal('unsubscribe'), eventTypes: z.array(z.string()).optional() }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('set_time_speed'), speed: z.number().min(0).max(100) }),
  z.object({ type: z.literal('mode_switch'), mode: z.enum(['character', 'god']) }),
  z.object({ type: z.literal('chat_message'), agentId: z.string().min(1), content: z.string().min(1) }),
  z.object({ type: z.literal('agent_chat'), fromAgentId: z.string().min(1), toAgentId: z.string().min(1), content: z.string().min(1) }),
  z.object({ type: z.literal('platform_new_post'), agentId: z.string().min(1), platformId: z.string().min(1), content: z.string().min(1) }),
  z.object({ type: z.literal('god_observe_agent'), agentId: z.string().min(1), includeThoughts: z.boolean().optional(), includeMemory: z.boolean().optional() }),
]);

export function validateWsMessage(raw: string): { success: true; data: z.infer<typeof WsMessageSchema> } | { success: false; error: Error } {
  if (raw.length > MAX_PAYLOAD_SIZE) {
    return { success: false, error: new Error('Payload too large (max 10KB)') };
  }

  try {
    const parsed = JSON.parse(raw);
    const result = WsMessageSchema.safeParse(parsed);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: new Error(result.error.errors.map(e => e.message).join(', ')) };
  } catch {
    return { success: false, error: new Error('Invalid JSON') };
  }
}