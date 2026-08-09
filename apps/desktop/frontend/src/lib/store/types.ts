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
}
