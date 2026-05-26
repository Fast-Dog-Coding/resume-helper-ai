# Candidate Concierge

Ask an AI about Grant's skills and work experience.

## Overview
The Candidate Concierge is a simple web application that allows users to query an AI about Grant Lindsay's resume and work experience. The concierge uses an AI (LLM) and displays the responses in a chat-like interface.

## Purpose
This application was built to showcase Grant's skills in using emerging technologies, such as AI, and to demonstrate his ability to create interactive, full-stack web applications.

## How to Use

[Try it for yourself](https://candidate-concierge.fastdogcoding.com/).

## How to Run Your Own Version
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies by running `npm install`.
4. Create an `.env` file in the project root. See `.env.sample` for a template and the [Required Environment Variables](#required-environment-variables) section below.
    - You will need an [OpenRouter](https://openrouter.ai/) developer account and a MongoDB cluster.
5. Start the application by running `npm start`.
6. Open your web browser and navigate to `http://localhost:3100` to access the chatbot interface.

### Required Environment Variables

The app validates required variables at startup and will exit if any are missing.

| Variable | Purpose |
|----------|---------|
| `APP_TITLE` | Application name sent to OpenRouter |
| `APP_HTTP_REFERER` | HTTP referer sent to OpenRouter |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL |
| `OPENROUTER_MODELS` | JSON array of model IDs (e.g. `["google/gemini-2.5-flash","openai/gpt-4.1-mini"]`) |
| `MONGODB_CONNECTION` | MongoDB connection string |
| `MONGODB_DB_NAME` | MongoDB database name |
| `COOKIE_ENCRYPTION_KEY` | 32-byte hex string for encrypting thread cookies |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds |
| `RATE_LIMIT_AMOUNT` | Max requests per window per IP |
| `RATE_LIMIT_PROXY` | Number of proxies between user and server |

Optional: `LOG_LEVEL` (default `info`), `LOG_DIR` (default `logs/`), `PORT` (default `3100`), `NODE_ENV`.

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript, and [marked.js](https://marked.js.org/) for Markdown rendering
- **Views:** [EJS](https://ejs.co/) templates served by [Express](https://expressjs.com/)
- **Backend:** Node.js with Express
- **Database:** MongoDB via [Mongoose](https://mongoosejs.com/) for threads, knowledge base, config, and logs
- **LLM:** [OpenRouter API](https://openrouter.ai/) for routing and chat completions
- **Security:** [Helmet](https://helmetjs.github.io/) (CSP), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit), AES-256 encrypted session cookies
- **Logging:** [Winston](https://github.com/winstonjs/winston) with daily rotating files and MongoDB transport
- **API client:** Fetch API for frontend requests to the backend

## Features
- Chat interface with conversation history persisted per browser session
- Knowledge base loaded from MongoDB and injected into the system prompt
- Markdown-formatted assistant responses
- Shift+Enter for new lines, Enter to send
- Rotating "dad joke" progress messages while the assistant is thinking
- Rate limiting, content security policy, and encrypted thread cookies
- Automatic thread expiration after 7 days

## Future Improvements

See [ROADMAP.md](ROADMAP.md) for the full list. Highlights include:
- Expanding the knowledge base (courses, dates, content descriptions)
- Migrating to a new hosting platform before AWS App Runner deprecation (2027)
- Adding unit tests for core logic
- Expanded error handling and documentation

## Feedback
If you have any feedback or suggestions for improvement, please feel free to reach out to the author, Grant Lindsay, at [grant@fastdogcoding.com](mailto:grant@fastdogcoding.com).

Copyright © 2024–2026 Fast Dog Coding
