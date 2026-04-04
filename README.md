# Candidate Concierge

Ask an AI about Grant's skills and work experience.

## Overview
The Candidate Concierge is a simple web application that allows users to query an AI about Grant Lindsay's resume and work experience. The concierge uses an AI (LLM) and displays the responses in a chat-like interface.

## Purpose
This application was built to showcase Grant's skills in using emerging technologies, such as AI, and to demonstrate his ability to create interactive, full-stack web applications.

## How to Use

[Try it for yourself](https://resume-bot.fastdogcoding.com/).

## How to Run Your Own Version
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies by running `npm install`.
4. Create an `.env` file with your API keys. (See `.env.sample` for reference.) 
    - You will need an OpenRouter developer account and a MongoDB cluster. MongoDB is required for tracking threads and saving activity logs.
5. Start the application by running `npm start`.
6. Open your web browser and navigate to `http://localhost:3100` to access the chatbot interface.

## Technologies Used
- HTML, CSS, and JavaScript for the frontend interface
- Node.js for the backend server
- Fetch API for making requests to the backend
- [OpenRouter API](https://openrouter.ai/) for LLM routing and completions
- MongoDB for application state, thread management, and logging

## Future Improvements
- Adding more data to enhance quality of responses
- Using random "Dad jokes" for progress messages.

## Feedback
If you have any feedback or suggestions for improvement, please feel free to reach out to the author, Grant Lindsay, at [grant@fastdogcoding.com](mailto:grant@fastdogcoding.com).

Copyright © 2026 Fast Dog Coding
