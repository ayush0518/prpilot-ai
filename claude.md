# Claude Instructions

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, use more compute via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user → update `tasks/lessons.md`
- Write rules to prevent repeating mistakes
- Iterate until mistake rate drops
- Review lessons at session start

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes
- Ask: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- Ask: "Is there a more elegant way?"
- Avoid hacky fixes
- Don’t over-engineer simple solutions
- Challenge your own work before presenting
- When given a bug → FIX it (no hand-holding)

### 6. Autonomous Bug Fixing

- Use logs, errors, failing tests to resolve issues
- No user context switching required
- Fix CI failures independently

---

## Task Management

1. Plan First → Write plan in `tasks/todo.md`
2. Verify Plan → Confirm before implementation
3. Track Progress → Mark items complete
4. Explain Changes → High-level summary each step
5. Document Results → Add review section in `tasks/todo.md`
6. Capture Lessons → Update `tasks/lessons.md`

---

## Core Principles

- Simplicity First → Minimal code changes
- No Laziness → Fix root cause, no temporary fixes
- Minimal Impact → Avoid side effects
