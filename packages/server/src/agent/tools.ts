import type { ToolContext, ToolResult } from './types.js';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  toFunctionDefinitions(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}