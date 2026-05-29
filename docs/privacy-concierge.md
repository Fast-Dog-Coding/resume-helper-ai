# Privacy & Terms — Candidate Concierge

*Last updated: May 28, 2026*

**Not legal advice.** This page describes how [Candidate Concierge](https://candidate-concierge.fastdogcoding.com/) handles information when you use the chat.

## At a glance

- **Operator:** Fast Dog Coding, LLC (Grant Lindsay).
- **What you send:** Questions and messages you type in the chat (for example, job requirements you paste for fit questions).
- **What we collect automatically:** An encrypted session cookie and standard server logs (including IP address for rate limiting).
- **Why:** To run the chat, remember your conversation in this browser, prevent abuse, and fix errors.
- **Who processes it:** OpenRouter and underlying AI model providers, MongoDB Atlas (database), Vercel (hosting), and CDNs for fonts and scripts.
- **How long:** Chat history is automatically deleted about **7 days** after the conversation starts; the session cookie lasts up to **7 days**.
- **Reset:** Clears your browser session and on-screen chat; **a copy on our servers may remain until the 7-day automatic deletion.**
- **Do not share:** Passwords, government IDs, financial data, or other sensitive personal information.
- **Questions:** [info@fastdogcoding.com](mailto:info@fastdogcoding.com)

---

## Privacy

### Who operates this service

Candidate Concierge is operated by **Fast Dog Coding, LLC**. For general website privacy (this marketing/portfolio site), see [fastdogcoding.com/privacy](https://fastdogcoding.com/privacy).

### Information you provide

When you use the chat, you may submit free-text questions and follow-up messages. Recruiters and hiring managers sometimes paste job descriptions or requirements. **All of that text is stored and sent to third-party AI providers** to generate responses.

Please **do not** submit passwords, government identification numbers, payment card or bank details, health information, or other highly sensitive personal data. We are not designed to collect or protect that category of information.

### Information collected automatically

- **Session cookie (`threadId`):** A random conversation identifier, stored in an encrypted, `httpOnly` cookie (up to 7 days; `SameSite=Strict`; secure in production) so your messages can be tied to one thread.
- **Server logs:** HTTP requests are logged (for example via our application logger). On production hosting, logs may appear in the platform console. Warnings and errors may also be stored in our database logging collection.
- **Rate limiting:** We use your IP address (and standard rate-limit headers) to cap how many API requests can be made in a time window.
- **No accounts:** This app does not offer sign-in and does not ask for your email or password.

### How we use information

- Provide and improve the chat experience
- Persist conversation history for your session
- Enforce usage limits and protect the service
- Diagnose errors and abuse

We do **not** sell your chat content.

### Third-party service providers

User messages (and the system context needed to answer about Grant’s professional background) are processed by:

| Provider | Role |
|----------|------|
| [OpenRouter](https://openrouter.ai/privacy) | Routes requests to configured AI models |
| Model providers (e.g. Google, OpenAI via OpenRouter) | Generate AI responses from your prompts |
| [MongoDB Atlas](https://www.mongodb.com/legal/privacy-policy) | Stores conversation threads |
| [Vercel](https://vercel.com/legal/privacy-policy) | Hosts the application |
| Google Fonts, jsDelivr | Deliver fonts and the Markdown renderer script |

Each provider has its own privacy practices. Content you submit may be processed in the United States or other regions where these providers operate.

### Retention

- **Chat threads:** Stored in MongoDB with an automatic expiration of approximately **7 days** from when the conversation was first created.
- **Session cookie:** Up to **7 days** from when it is set, unless you clear it sooner.
- **Server logs:** Retained as long as reasonably necessary for operations, security, and troubleshooting (subject to our hosting and database providers’ practices).

### Reset and ending your session

The **Reset** control clears the session cookie and removes messages from your browser view. **It does not guarantee immediate deletion of the conversation on our servers**; server-side copies may remain until the automatic 7-day expiration described above.

You can also stop using the service at any time.

### AI-generated responses

This application uses large language models. Responses can be incomplete or incorrect. **Verify important details directly with Grant** before making hiring or business decisions.

### Your choices and contact

- Stop using the chat at any time.
- Use **Reset** to end the current browser session (with the server retention caveat above).
- Email **info@fastdogcoding.com** with privacy questions or requests. We will respond when practicable; this is a small portfolio tool without a formal data-request portal.

### Changes to this notice

We may update this page from time to time. The “Last updated” date at the top will change when we do. Continued use of the chat after changes constitutes acceptance of the updated notice.

---

## Terms of use

### Permitted use

You may use Candidate Concierge to learn about Grant Lindsay’s professional background, skills, and experience—for example, as a recruiter, hiring manager, or colleague exploring fit for a role.

### Prohibited use

You may not:

- Abuse, harass, or submit illegal content
- Attempt to bypass rate limits or disrupt the service
- Use automated tools to scrape or flood the API
- Try to extract system instructions, hidden prompts, or non-public data through prompt injection or similar techniques

### No professional advice

Responses are **informational only** and are not legal, HR, employment, or professional advice.

### Disclaimer

THE SERVICE IS PROVIDED **“AS IS”** WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, FAST DOG CODING, LLC DISCLAIMS LIABILITY FOR DAMAGES ARISING FROM YOUR USE OF THE CHAT OR RELIANCE ON AI-GENERATED CONTENT.

### Moderation

We may rate-limit, block, or refuse requests that violate these terms or provider policies. Some requests may be rejected by upstream AI moderation.

### Governing law

These terms are governed by the laws of the State in which Fast Dog Coding, LLC is organized, without regard to conflict-of-law rules, except where prohibited.
