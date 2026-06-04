# ⚙️ CODING FLOW

## PURPOSE
Defines HOW to write safe, scalable code.

---

## CORE RULE

UI must NEVER break existing system.

---

## ARCHITECTURE

UI → Hooks → Services → API → DB

---

## RULES

- One feature at a time
- No business logic in UI components
- Always reuse existing components
- Keep components small and focused
- Extend instead of rewriting

---

## UI SAFETY

- Do not break layout or styling
- Do not change structure unless required
- Preserve responsiveness
- Avoid duplication

---

## THINK BEFORE CODING

- Will this break existing UI?
- Can I reuse something?
- Is change minimal?

If uncertain → stop and re-evaluate.