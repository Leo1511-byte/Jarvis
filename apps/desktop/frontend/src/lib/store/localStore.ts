import { BUILTIN_CONNECTIONS } from "./builtinConnections";
import type {
  Connection,
  ConnectionCapability,
  Conversation,
  JarvisStore,
  Message,
  NewMessageInput,
  NewProjectInput,
  NewTaskInput,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from "./types";

/**
 * localStorage-backed implementation. This is the REAL, active store
 * until Supabase is actually provisioned (spec principle #5: don't
 * fake connection status -- so don't pretend to be Supabase-backed
 * when there's no project to connect to). Data persists across app
 * restarts on this machine, but doesn't sync anywhere. See
 * supabaseStore.ts for the swap-in replacement once M7 is finished.
 */
const PROJECTS_KEY = "jarvis.local.projects";
const TASKS_KEY = "jarvis.local.tasks";
const CONVERSATIONS_KEY = "jarvis.local.conversations";
const MESSAGES_KEY = "jarvis.local.messages";

function uuid(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// Fixed timestamp for the static, non-user-created connection rows below --
// there's no real "created at" for something that's always just been part
// of the app, and a fresh Date() on every listConnections() call would
// make the same row look like it changes on every render for no reason.
const EPOCH = "2026-08-11T00:00:00.000Z";

function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function loadMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]): void {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export class LocalStore implements JarvisStore {
  async listProjects(): Promise<Project[]> {
    return loadProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createProject(input: NewProjectInput): Promise<Project> {
    const project: Project = {
      id: uuid(),
      name: input.name,
      description: input.description ?? null,
      status: "active",
      repoUrl: input.repoUrl ?? null,
      obsidianPath: input.obsidianPath ?? null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    const projects = loadProjects();
    projects.push(project);
    saveProjects(projects);
    return project;
  }

  async updateProject(
    id: string,
    patch: Partial<NewProjectInput> & { status?: ProjectStatus }
  ): Promise<Project> {
    const projects = loadProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project not found: ${id}`);
    const updated: Project = {
      ...projects[idx],
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.repoUrl !== undefined ? { repoUrl: patch.repoUrl } : {}),
      ...(patch.obsidianPath !== undefined ? { obsidianPath: patch.obsidianPath } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: nowISO(),
    };
    projects[idx] = updated;
    saveProjects(projects);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    saveProjects(loadProjects().filter((p) => p.id !== id));
    // Cascade, matching the migration's `on delete cascade` for tasks.project_id.
    saveTasks(loadTasks().filter((t) => t.projectId !== id));
  }

  async listTasks(projectId?: string): Promise<Task[]> {
    const tasks = loadTasks();
    const filtered = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createTask(input: NewTaskInput): Promise<Task> {
    const task: Task = {
      id: uuid(),
      projectId: input.projectId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: "todo",
      priority: input.priority ?? null,
      deadline: input.deadline ?? null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: null,
    };
    const tasks = loadTasks();
    tasks.push(task);
    saveTasks(tasks);
    return task;
  }

  async updateTask(
    id: string,
    patch: Partial<NewTaskInput> & { status?: TaskStatus }
  ): Promise<Task> {
    const tasks = loadTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);
    const updated: Task = {
      ...tasks[idx],
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
      ...(patch.status !== undefined
        ? { status: patch.status, completedAt: patch.status === "done" ? nowISO() : tasks[idx].completedAt }
        : {}),
      updatedAt: nowISO(),
    };
    tasks[idx] = updated;
    saveTasks(tasks);
    return updated;
  }

  async listConversations(): Promise<Conversation[]> {
    return loadConversations().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createConversation(title?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuid(),
      title: title ?? null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    const conversations = loadConversations();
    conversations.push(conversation);
    saveConversations(conversations);
    return conversation;
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return loadMessages()
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createMessage(input: NewMessageInput): Promise<Message> {
    const message: Message = {
      id: uuid(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: nowISO(),
    };
    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    // Keep the parent conversation's updatedAt current (same "touch on
    // write" convention as tasks bumping their own updatedAt) so
    // listConversations' most-recent-first ordering reflects real activity,
    // and derive a title from the first user message if none was set --
    // lets a conversation show something readable in a list without
    // requiring the caller to name it up front.
    const conversations = loadConversations();
    const idx = conversations.findIndex((c) => c.id === input.conversationId);
    if (idx !== -1) {
      const current = conversations[idx];
      conversations[idx] = {
        ...current,
        title:
          current.title ?? (input.role === "user" ? input.content.slice(0, 60) : current.title),
        updatedAt: nowISO(),
      };
      saveConversations(conversations);
    }
    return message;
  }

  async listConnections(): Promise<Connection[]> {
    // Static, not localStorage-backed -- see builtinConnections.ts's doc
    // comment for why these are fixed rows rather than user-created data.
    return BUILTIN_CONNECTIONS.map((c) => ({
      id: c.id,
      name: c.id,
      createdAt: EPOCH,
    }));
  }

  async listConnectionCapabilities(connectionId: string): Promise<ConnectionCapability[]> {
    const found = BUILTIN_CONNECTIONS.find((c) => c.id === connectionId);
    if (!found) return [];
    return found.capabilities.map((cap) => ({
      id: `${connectionId}:${cap.capability}`,
      connectionId,
      capability: cap.capability,
      readOnly: cap.readOnly,
    }));
  }
}
