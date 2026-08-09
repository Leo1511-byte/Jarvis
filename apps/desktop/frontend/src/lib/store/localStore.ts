import type {
  JarvisStore,
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

function uuid(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

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
}
