import { SKILLS } from "../../skills/registry";

/**
 * Milestone 24 (Skills data model), reworked in Milestone 31.
 *
 * Originally this was a hand-maintained copy of the six commands'
 * metadata, kept in sync with permissions.ts and commandEngine.ts only by
 * a regression test (see permissions.test.ts). Milestone 31 introduced
 * skills/registry.ts as the single source of truth for a Skill's id,
 * name, description, permission level, connections, and (new) execution
 * behavior — this file now just projects that registry into the shape
 * the store/UI layer (LocalStore's fallback list, ConnectionsView-style
 * consumers) expects, dropping `domain`/`execute` which aren't part of
 * the descriptive DB schema.
 */
export interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3;
  connectionIds: string[];
}

export const BUILTIN_SKILLS: BuiltinSkill[] = SKILLS.map((skill) => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  permissionLevel: skill.permissionLevel,
  connectionIds: skill.connectionIds,
}));
