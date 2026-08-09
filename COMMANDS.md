# Commands (target UX — not yet implemented)

Natural language, no rigid syntax, one command engine shared by typed and spoken input
(`AGENT_SYSTEM.md`).

## Target examples

Open Ape War. Continue development. What should I work on? Create a task. Remember this.
Search memory for camera controller. Research competitors. Show today's schedule. Switch to
Neon Void. Show system status.

## Today's real equivalents

The existing Jarvis skill already implements a handful of these as script-backed trigger
phrases: "what's open," "connect this," "file this," "say that out loud," "morning brief."
Those work now, in Cowork/Claude conversation — there's no command bar or palette UI yet
(Milestone 3/5), so there's no `Cmd+K` to build a full command engine into.

## Not building yet

The command engine (Milestone 5) is UI-dependent — it needs a desktop shell to live in. Until
then, "commands" means the trigger phrases documented in the Jarvis skill.
