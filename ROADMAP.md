# Candidate Concierge — Roadmap

This document outlines planned improvements, technical debt, and new features for the assistant.

## Rename
- ~~Rename the project to "Candidate Concierge".~~ (Done)

## Platform Migration
- ~~**Migrate away from OpenAI Assistants API:** The current API is being deprecated. We need to refactor the backend communication to use the generic OpenAI Chat Completions API (Responses API) or migrate to a new LLM provider like Gemini. Another option to evaluate is OpenRouter.~~ (Done — migrated to OpenRouter via Chat Completions API; thread history managed in MongoDB)
- ~~**Adopt File Search Stores:** For RAG of resume, projects, and other relevant files for the LLM to use to answer questions.~~ (Done — Knowledge Base loaded from MongoDB and injected as static text in the system prompt; implicit caching via OpenRouter)
- [ ] **Move to Vercel:** Code and docs ready ([DEPLOYMENT.md](DEPLOYMENT.md)). Remaining: create Vercel project, configure env vars, pilot deploy, DNS cutover from AWS App Runner, decommission App Runner after soak period. See [HOSTING.md](HOSTING.md) for studio-wide hosting defaults.

## New Features
- [ ] **AI Files/Context Expansions:** Add a list of courses taken, dates completed, and content descriptions to better ground the AI's responses about continuous learning and background.
- ~~**Improved "Progress" Messaging:** Swap the generic loading messages for a rotation of random "Dad jokes" to keep the experience light and uniquely human while the bot is "thinking".~~ (Done — messages served from `config/ui.js` via EJS template injection into `window.APP_CONFIG`)
- ~~**UI > New Lines:** Allow user to add new lines to questions. Other LLM's inputs permit [shift] + [enter] to add a new line and [enter] for sending.~~ (Done)

## Reliability & Maintainability
- [ ] **Add Unit Tests:** The project currently relies on manual testing. Adding a test suite (e.g., using Jest) for core logic (messages, validation, moderation parsing) will improve stability.
- ~~**Thread Expiration:** Implement logic to proactively expire old threads rather than relying solely on the UI's manual clear.~~ (Done — TTL index in `Thread.js` + 7-day expiration in middleware)
- [ ] **Expanded Error Handling:** Add comprehensive catch blocks in remaining middleware.
- [ ] **Code Comments:** Add more extensive JSDoc strings and inline comments to document complex async flows.
- ~~**Logging clean up:** Move logging artifacts to a folder off the root directory (e.g. /logs) that can be excluded from version control.~~ (Done — `LOG_DIR` env var, `/logs` directory with daily rotation)
- [ ] **Dependency Management:** Should we upgrade any dependencies?
