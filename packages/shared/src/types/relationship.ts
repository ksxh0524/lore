export type RelationshipType =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'best_friend'
  | 'dating'
  | 'partner'
  | 'spouse'
  | 'ex'
  | 'enemy'
  | 'rival'
  | 'family'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'colleague'
  | 'coworker'
  | 'boss'
  | 'subordinate'
  | 'neighbor'
  | 'mentor'
  | 'student';

export interface Relationship {
  agentId: string;
  targetAgentId: string;
  worldId: string;
  type: RelationshipType;
  intimacy: number;
  history: string[];
  updatedAt: Date;
}
