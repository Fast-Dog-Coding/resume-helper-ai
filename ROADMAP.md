# Candidate Concierge — Roadmap

This document outlines planned improvements, technical debt, and new features for the assistant.

*Refreshed November 2026 after the resume-master 2.0.0 cutover.*

## Rename
- ~~Rename the project to "Candidate Concierge".~~ (Done)

## Platform Migration
- ~~**Migrate away from OpenAI Assistants API:** The current API is being deprecated. We need to refactor the backend communication to use the generic OpenAI Chat Completions API (Responses API) or migrate to a new LLM provider like Gemini. Another option to evaluate is OpenRouter.~~ (Done — OpenRouter Chat Completions; thread history stored in MongoDB)
- ~~**Adopt File Search Stores:** For RAG of resume, projects, and other relevant files for the LLM to use to answer questions.~~ (Done — resume facts come from the resume-master JSON projection, held in an in-memory cache (default 15 minutes) and injected into the system prompt. MongoDB still supplies `concierge_instructions` and the STAR document `07_AI_Asst_STAR-Formatted_Responses.md`.)
- ~~**Re-vendor resume-master 2.0.0 and take the career-window cutoff from that projection.**~~ (Done — `@fastdogcoding/resume-master` 2.0.0 is vendored at `packages/resume-master` for the `concierge` client, stamp commit `0ae59e5`, generated 2026-11-04. `buildContext()` calls `getResume` with no `cutOffDate` override. The service applies the cutoff on `meta.cutOffDate`; this app strips `meta` before the prompt. Projection dates are year precision (`YYYY`). `config/instructions.md` describes the window as the recent 10 years. `npm run sync:db` (`scripts/sync-concierge-db.js`) upserts those instructions and deletes Knowledge documents other than the STAR file.)
- [ ] **Move to Vercel:** The public site is on Vercel. During this November 2026 refresh, `https://candidate-concierge.fastdogcoding.com/` responded with `server: Vercel` and this Express app. App code and the runbook are in [DEPLOYMENT.md](DEPLOYMENT.md); `vercel.json` sets `maxDuration` to 300. Remaining: confirm AWS App Runner is drained and decommission the service, IAM, secrets, and CI, as [DEPLOYMENT.md](DEPLOYMENT.md) and [HOSTING.md](HOSTING.md) still describe.

## New Features
- [ ] **AI Files/Context Expansions:** Add a list of courses taken, dates completed, and content descriptions to better ground the AI's responses about continuous learning and background. The concierge projection type allows `education[].courses` as strings. Completion dates and course descriptions are still absent; `config/instructions.md` tells the model education dates are not in the knowledge base.
- ~~**Improved "Progress" Messaging:** Swap the generic loading messages for a rotation of random "Dad jokes" to keep the experience light and uniquely human while the bot is "thinking".~~ (Done — messages served from `config/ui.js` via EJS template injection into `window.APP_CONFIG`)
- ~~**UI > New Lines:** Allow user to add new lines to questions. Other LLM's inputs permit [shift] + [enter] to add a new line and [enter] for sending.~~ (Done)

## Reliability & Maintainability
- [ ] **Add Unit Tests:** Partially done. `npm test` runs Node's built-in runner (`node --test`). Covered: ask-assistant input validation (`test/ask-assistant.validation.test.js`), context building and the resume cache (`test/context.test.js`), and the vendored resume-master client (`test/resume-master.test.js`). Still open: `processChat` and message assembly, moderation-policy parsing in the browser client, cookie middleware, `scripts/sync-concierge-db.js`, and thread expiration.
- ~~**Thread Expiration:** Implement logic to proactively expire old threads rather than relying solely on the UI's manual clear.~~ (Done — TTL index in `Thread.js` + 7-day expiration in middleware)
- [ ] **Expanded Error Handling:** Add comprehensive catch blocks in remaining middleware. Ask, thread read, context build, chat processing, and the Mongo connection middleware already catch and forward errors. `setThreadId` and `DELETE /thread` still do not.
- [ ] **Code Comments:** Add more extensive JSDoc strings and inline comments to document complex async flows. JSDoc already covers `config/context.js`, the cookie middleware, and much of `public/js/script.js`. `controllers/assistant.js` (`processChat`) and the Mongoose models still have little or none.
- ~~**Logging clean up:** Move logging artifacts to a folder off the root directory (e.g. /logs) that can be excluded from version control.~~ (Done — `LOG_DIR` env var, `/logs` directory with daily rotation)
- [ ] **Dependency Management:** Should we upgrade any dependencies? A full pass is still open. Recent targeted bumps only: the `qs` advisory patch and Vercel CLI `^65.4.0`.
