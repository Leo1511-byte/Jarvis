import { beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "./localStore";

describe("LocalStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and lists projects", async () => {
    const store = new LocalStore();
    await store.createProject({ name: "Ape War" });
    await store.createProject({ name: "JARVIS" });

    const projects = await store.listProjects();
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.name)).toContain("Ape War");
    expect(projects.every((p) => p.status === "active")).toBe(true);
  });

  it("updates a project", async () => {
    const store = new LocalStore();
    const created = await store.createProject({ name: "Ape War" });
    const updated = await store.updateProject(created.id, { status: "paused" });
    expect(updated.status).toBe("paused");
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Ape War");
  });

  it("throws on updating a nonexistent project", async () => {
    const store = new LocalStore();
    await expect(store.updateProject("does-not-exist", { status: "paused" })).rejects.toThrow();
  });

  it("creates tasks scoped to a project and lists them filtered", async () => {
    const store = new LocalStore();
    const project = await store.createProject({ name: "Ape War" });
    await store.createTask({ projectId: project.id, title: "Fix camera bug" });
    await store.createTask({ title: "Unrelated task" });

    const scoped = await store.listTasks(project.id);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].title).toBe("Fix camera bug");

    const all = await store.listTasks();
    expect(all).toHaveLength(2);
  });

  it("marks completedAt when a task is set to done", async () => {
    const store = new LocalStore();
    const task = await store.createTask({ title: "Ship it" });
    expect(task.completedAt).toBeNull();

    const done = await store.updateTask(task.id, { status: "done" });
    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();
  });

  it("persists across store instances (same localStorage)", async () => {
    const storeA = new LocalStore();
    await storeA.createProject({ name: "Persisted" });

    const storeB = new LocalStore();
    const projects = await storeB.listProjects();
    expect(projects.map((p) => p.name)).toContain("Persisted");
  });

  it("creates a conversation and lists messages in chronological order", async () => {
    const store = new LocalStore();
    const conversation = await store.createConversation();
    await store.createMessage({ conversationId: conversation.id, role: "user", content: "hi" });
    await store.createMessage({
      conversationId: conversation.id,
      role: "jarvis",
      content: "hello",
    });

    const messages = await store.listMessages(conversation.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("hi");
    expect(messages[1].content).toBe("hello");
  });

  it("derives a conversation title from the first user message", async () => {
    const store = new LocalStore();
    const conversation = await store.createConversation();
    await store.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "what's on my calendar today",
    });

    const [found] = await store.listConversations();
    expect(found.title).toBe("what's on my calendar today");
  });

  it("does not overwrite an existing conversation title", async () => {
    const store = new LocalStore();
    const conversation = await store.createConversation("Named up front");
    await store.createMessage({ conversationId: conversation.id, role: "user", content: "hi" });

    const [found] = await store.listConversations();
    expect(found.title).toBe("Named up front");
  });

  it("scopes listMessages to the requested conversation", async () => {
    const store = new LocalStore();
    const a = await store.createConversation();
    const b = await store.createConversation();
    await store.createMessage({ conversationId: a.id, role: "user", content: "in a" });
    await store.createMessage({ conversationId: b.id, role: "user", content: "in b" });

    const messagesA = await store.listMessages(a.id);
    expect(messagesA).toHaveLength(1);
    expect(messagesA[0].content).toBe("in a");
  });

  it("lists the six built-in connections", async () => {
    const store = new LocalStore();
    const connections = await store.listConnections();
    expect(connections.map((c) => c.id).sort()).toEqual(
      ["calendar", "gmail", "github", "obsidian", "supabase", "web"].sort()
    );
  });

  it("lists a connection's capabilities, and none for an unknown connection", async () => {
    const store = new LocalStore();
    const obsidianCaps = await store.listConnectionCapabilities("obsidian");
    expect(obsidianCaps.map((c) => c.capability).sort()).toEqual(["read-vault", "write-notes"]);
    expect(obsidianCaps.every((c) => c.connectionId === "obsidian")).toBe(true);

    const unknown = await store.listConnectionCapabilities("does-not-exist");
    expect(unknown).toEqual([]);
  });
});
