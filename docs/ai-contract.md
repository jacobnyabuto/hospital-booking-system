\# AI Feature Contract: Symptom-to-Doctor Recommender



Status: approved. All data is fictional demo data. The AI is advisory only.



\## Frontend

\- Component `AiAssistant.jsx` on the Home page and top of `/doctors`.

\- Guests see "Log in to use the assistant". Logged-in users get one textarea (1 to 500 characters, live counter).

\- Results: up to 3 doctor cards (name, specialty, short reason, link to `/doctors/:id`).

\- States: loading, urgent, no match, rate limited, unavailable (with retry and a link to the specialty filter).

\- Disclaimer always visible. The assistant never books anything.



\## Endpoint

`POST /api/ai/recommend-doctor`

\- Auth: any logged-in user (401 otherwise). Body: `{ message }` only.

\- Validation: string only, trimmed, whitespace collapsed, control characters removed, 1 to 500 characters (400 otherwise).

\- Rate limit: 10 requests per hour per user ID (429). In-memory, so a restart resets it.



\## Processing order

1\. Validate input.

2\. Server-side emergency keyword check. On a match, return the urgent response and stop (no AI call).

3\. Load active doctors (`\_id`, `fullName`, `specialty`, `location` only).

4\. Call the provider with an 8-second timeout. On failure, use the fallback.

5\. Parse and validate the model's JSON.

6\. Keep only `doctorId`s present in the loaded list (deduplicated, maximum 3).

7\. Return the grounded response.



\## Data sent to the provider

Sent: the cleaned message and the doctor list (`\_id`, `fullName`, `specialty`, `location`).

Never sent: user name, email, insurer, user ID, appointments, fees, bios, tokens.

The model may only select from supplied doctors. It must never diagnose, advise treatment, or state availability, prices or booking status. User text is treated as data, not instructions. Real protection comes from schema validation and MongoDB ID verification.



\## Model output

`{ "recommendations": \[ { "doctorId": "...", "reason": "..." } ] }`

Invalid JSON or wrong shape counts as provider failure. Unknown IDs and duplicates are dropped. `reason` is trimmed and cut at 160 characters. The backend writes `summary` and `disclaimer` itself.



\## Responses

\- 200 normal: `{ urgent: false, source: "ai" | "fallback", summary, recommendations, disclaimer }`

\- 200 urgent: `{ urgent: true, message, recommendations: \[] }` (911, or 988 in the US)

\- 400 invalid input, 401 no token, 429 rate limit

\- 503 only when the provider failed and the fallback found nothing

Each recommendation returned to the client is { doctorId, doctorName, specialty, reason }. Name and specialty come from MongoDB, never from the model.

\## Fallback

Provider failure, timeout or unusable output: a keyword-to-specialty map returns real doctors with `source: "fallback"`. No keyword match: 503 with a message suggesting the specialty filter.
Provider failure with a keyword match returns 200 with source "fallback". Only a failure with no match returns 503.


\## Privacy and logging

Nothing is stored. Logs hold only status, source, latency and result count, never the message, prompt or key.



\## Configuration (backend only)

`AI\_PROVIDER`, `AI\_MODEL`, `AI\_API\_KEY`, `AI\_TIMEOUT\_MS=8000`



\## Limitations

The emergency keyword list is a safety net, not a medical device, and can miss or over-trigger. Symptom text goes to a third-party provider, acceptable only for fictional demo data. Rate limiting is in memory.

