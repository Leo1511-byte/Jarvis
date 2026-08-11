import { supabase } from "../supabaseClient";
import type {
  Connection,
  ConnectionCapability,
  Conversation,
  JarvisStore,
  Message,
  MessageRole,
  NewMessageInput,
  NewProjectInput,
  NewTaskInput,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from "./types";

/**
 * Supabase-backed implementation, matching packages/database/migrations/0001_init.sql.
 * WRITTEN BUT NEVER RUN -- there is no Supabase project provisioned
 * (Cowork can't create accounts). Do not switch store/index.ts to use
 * this until you've: (1) created a project, (2) run the migration,
 * (3) set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY, (4) actually
 * tested each method below against the real database.
 */

// --- row <-> domain type mapping (DB is snake_case, app is camelCase) ---

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  repo_url: string | null;
  obsidian_path: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Task["priority"];
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    repoUrl: row.repo_url,
    obsidianPath: row.obsidian_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

// Milestone 21 — matches packages/database/migrations/0002_chat.sql.
interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

function conversationFromRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function messageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

// Milestone 23 — matches packages/database/migrations/0003_connections.sql.
interface ConnectionRow {
  id: string;
  name: string;
  created_at: string;
}

interface ConnectionCapabilityRow {
  id: string;
  connection_id: string;
  capability: string;
  read_only: boolean;
}

function connectionFromRow(row: ConnectionRow): Connection {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function connectionCapabilityFromRow(row: ConnectionCapabilityRow): ConnectionCapability {
  return {
    id: row.id,
    connectionId: row.connection_id,
    capability: row.capability,
    readOnly: row.read_only,
  };
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example)."
    );
  }
  return supabase;
}

export class SupabaseStore implements JarvisStore {
  async listProjects(): Promise<Project[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as ProjectRow[]).map(projectFromRow);
  }

  async createProject(input: NewProjectInput): Promise<Project> {
    const client = requireClient();
    const { data, error } = await client
      .from("projects")
      .insert({
        name: input.name,
        description: input.description ?? null,
        repo_url: input.repoUrl ?? null,
        obsidian_path: input.obsidianPath ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return projectFromRow(data as ProjectRow);
  }

  async updateProject(
    id: string,
    patch: Partial<NewProjectInput> & { status?: ProjectStatus }
  ): Promise<Project> {
    const client = requireClient();
    const { data, error } = await client
      .from("projects")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.repoUrl !== undefined ? { repo_url: patch.repoUrl } : {}),
        ...(patch.obsidianPath !== undefined ? { obsidian_path: patch.obsidianPath } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return projectFromRow(data as ProjectRow);
  }

  async deleteProject(id: string): Promise<void> {
    const client = requireClient();
    // Migration's `on delete cascade` on tasks.project_id handles the task cleanup.
    const { error } = await client.from("projects").delete().eq("id", id);
    if (error) throw error;
  }

  async listTasks(projectId?: string): Promise<Task[]> {
    const client = requireClient();
    let query = client.from("tasks").select("*").order("updated_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as TaskRow[]).map(taskFromRow);
  }

  async createTask(input: NewTaskInput): Promise<Task> {
    const client = requireClient();
    const { data, error } = await client
      .from("tasks")
      .insert({
        project_id: input.projectId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? null,
        deadline: input.deadline ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return taskFromRow(data as TaskRow);
  }

  async updateTask(
    id: string,
    patch: Partial<NewTaskInput> & { status?: TaskStatus }
  ): Promise<Task> {
    const client = requireClient();
    const { data, error } = await client
      .from("tasks")
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.status === "done" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return taskFromRow(data as TaskRow);
  }

  async listConversations(): Promise<Conversation[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as ConversationRow[]).map(conversationFromRow);
  }

  async createConversation(title?: string): Promise<Conversation> {
    const client = requireClient();
    const { data, error } = await client
      .from("conversations")
      .insert({ title: title ?? null })
      .select()
      .single();
    if (error) throw error;
    return conversationFromRow(data as ConversationRow);
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as MessageRow[]).map(messageFromRow);
  }

  async createMessage(input: NewMessageInput): Promise<Message> {
    const client = requireClient();
    const { data, error } = await client
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
      })
      .select()
      .single();
    if (error) throw error;

    // Same "touch + derive title on first message" behavior as LocalStore --
    // read-then-write rather than a DB trigger, since there's no migration
    // machinery here for triggers and this keeps the logic in one place
    // (app code) instead of split between SQL and TypeScript. Best-effort:
    // a failure here shouldn't fail the message write that already
    // succeeded, so it's caught and swallowed rather than thrown.
    try {
      const { data: convo } = await client
        .from("conversations")
        .select("title")
        .eq("id", input.conversationId)
        .single();
      await client
        .from("conversations")
        .update({
          ...(!convo?.title && input.role === "user"
            ? { title: input.content.slice(0, 60) }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.conversationId);
    } catch {
      // Non-fatal -- see comment above.
    }

    return messageFromRow(data as MessageRow);
  }

  async listConnections(): Promise<Connection[]> {
    const client = requireClient();
    const { data, error } = await client.from("connections").select("*").order("name");
    if (error) throw error;
    return (data as ConnectionRow[]).map(connectionFromRow);
  }

  async listConnectionCapabilities(connectionId: string): Promise<ConnectionCapability[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("connection_capabilities")
      .select("*")
      .eq("connection_id", connectionId);
    if (error) throw error;
    return (data as ConnectionCapabilityRow[]).map(connectionCapabilityFromRow);
  }
}
