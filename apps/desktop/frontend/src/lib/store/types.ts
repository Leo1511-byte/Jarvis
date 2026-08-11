/**
 * Shape matches packages/database/migrations/0001_init.sql exactly, so
 * swapping the local adapter for the real Supabase one (once a project
 * exists) is a one-file change, not a data-model rewrite.
 */

export type ProjectStatus = "active" | "paused" | "archived";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  repoUrl: string | null;
  obsidianPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface NewProjectInput {
  name: string;
  description?: string;
  repoUrl?: string;
  obsidianPath?: string;
}

export interface NewTaskInput {
  projectId?: string | null;
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
}

/**
 * Milestone 21 (Chat backbone) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md.
 * A conversation is just a container for messages; title is nullable and
 * left for the UI to derive (e.g. from the first message) rather than
 * requiring one up front.
 */
export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "jarvis";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface NewMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
}

/**
 * Milestone 23 (Connections registry) — identity + capability metadata
 * only, never credentials (see builtinConnections.ts). `id` is a stable
 * slug (`"calendar"`, `"gmail"`, ...) rather than a generated uuid, since
 * these are fixed, known-in-advance rows, not user-created ones.
 */
export interface Connection {
  id: string;
  name: string;
  createdAt: string;
}

export interface ConnectionCapability {
  id: string;
  connectionId: string;
  capability: string;
  readOnly: boolean;
}

/**
 * Milestone 24 (Skills data model) — see builtinSkills.ts's doc comment
 * for the deliberate scope decision this represents (a descriptive
 * registry, not a rewrite of commandEngine.ts's proven prompt logic).
 * `permissionLevel` mirrors `permissions.ts`'s `PermissionLevel` exactly.
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3;
  builtin: boolean;
  createdAt: string;
}

/**
 * Milestone 26 — extends the `activity_events` table 0001_init.sql already
 * created (per SECURITY.md's Level 2 "every action must be traceable"
 * rule) rather than inventing a parallel `skill_runs` log. `skillId`/
 * `conversationId` are new, nullable columns added by
 * 0005_activity_events_skill_tracking.sql; `projectId`/`type`/`summary`
 * already existed but had no store methods reading/writing them until now
 * -- this is the first real use of the table at all.
 */
export interface ActivityEvent {
  id: string;
  projectId: string | null;
  skillId: string | null;
  conversationId: string | null;
  type: string;
  summary: string;
  createdAt: string;
}

export interface NewActivityEventInput {
  projectId?: string | null;
  skillId?: string | null;
  conversationId?: string | null;
  type: string;
  summary: string;
}

/**
 * Every store implementation (local, Supabase, ...) implements this.
 * Callers never import a concrete store directly -- they get one from
 * store/index.ts, which decides which implementation to use.
 */
export interface JarvisStore {
  listProjects(): Promise<Project[]>;
  createProject(input: NewProjectInput): Promise<Project>;
  updateProject(id: string, patch: Partial<NewProjectInput> & { status?: ProjectStatus }): Promise<Project>;
  /** Level 3 (sensitive) per SECURITY.md — callers must route this through an approval step. */
  deleteProject(id: string): Promise<void>;

  listTasks(projectId?: string): Promise<Task[]>;
  createTask(input: NewTaskInput): Promise<Task>;
  updateTask(id: string, patch: Partial<NewTaskInput> & { status?: TaskStatus }): Promise<Task>;

  /** Milestone 21: chat backbone. listConversations sorts most-recently-
   * updated first (same convention as listProjects/listTasks); listMessages
   * sorts chronologically (oldest first) since that's how a conversation
   * reads, not by recency. */
  listConversations(): Promise<Conversation[]>;
  createConversation(title?: string): Promise<Conversation>;
  listMessages(conversationId: string): Promise<Message[]>;
  createMessage(input: NewMessageInput): Promise<Message>;

  /** Milestone 23: read-only registry, see Connection's doc comment above. */
  listConnections(): Promise<Connection[]>;
  listConnectionCapabilities(connectionId: string): Promise<ConnectionCapability[]>;

  /** Milestone 24: read-only registry, see Skill's doc comment above. */
  listSkills(): Promise<Skill[]>;
  listSkillConnections(skillId: string): Promise<Connection[]>;

  /** Milestone 26: see ActivityEvent's doc comment above. listActivityEvents
   * sorts most-recent-first, same convention as listProjects/listTasks. */
  listActivityEvents(limit?: number): Promise<ActivityEvent[]>;
  createActivityEvent(input: NewActivityEventInput): Promise<ActivityEvent>;
}
