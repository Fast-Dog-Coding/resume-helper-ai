# Resume Helper AI — Roadmap

This document outlines planned improvements, technical debt, and new features for the assistant.

## Rename
- Rename the project to "Resume Concierge". (Actual name up for discussion.)

## Platform Migration
- **Migrate away from OpenAI Assistants API:** The current API is being deprecated. We need to refactor the backend communication to use the generic OpenAI Chat Completions API (Responses API) or migrate to a new LLM provider like Gemini. Another option to evaluate is OpenRouter.
- **Adopt File Search Stores:** For RAG of resume, projects, and other relevant files for the LLM to use to annswer questions. 

## New Features
- **AI Files/Context Expansions:** Add a list of courses taken, dates completed, and content descriptions to better ground the AI's responses about continuous learning and background.
- **Improved "Progress" Messaging:** Swap the generic loading messages for a rotation of random "Dad jokes" to keep the experience light and uniquely human while the bot is "thinking".
- **UI > New Lines:** Allow user to add new lines to questions. Other LLM's inputs permit [shift] + [enter] to add a new line and [enter] for sending.

## Reliability & Maintainability
- **Add Unit Tests:** The project currently relies on manual testing. Adding a test suite (e.g., using Jest) for core logic (messages, validation, moderation parsing) will improve stability.
- **Thread Expiration:** Implement logic to proactively expire old threads rather than relying solely on the UI's manual clear.
- **Expanded Error Handling:** Add comprehensive catch blocks in remaining middleware.
- **Code Comments:** Add more extensive JSDoc strings and inline comments to document complex async flows.
- **Logging clean up:** Move logging artifacts to a folder off the root directory (e.g. /logs) that can be excluded from version control.
- **Dependency Management:** Shoud we upgrade any dependencies?
