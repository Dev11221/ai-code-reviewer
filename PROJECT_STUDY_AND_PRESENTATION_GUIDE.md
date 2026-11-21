# AI Code Reviewer — Team Study & Presentation Guide

Use this guide to prepare the presentation and report. The four study sections are suggested ownership areas; they are not a claim about who completed the work. Replace “Member 1–4” with your names and adjust the split to match each person’s actual contribution.

**Suggested credit split:** Member 1 — 25%; Member 2 — 25%; Member 3 — 25%; Member 4 — 25%, if effort was approximately equal. Change the percentages to reflect the work your team actually completed.

## 1. Shared project overview — everyone should know this

**What it is:** AI Code Reviewer is a web application that reviews GitHub pull requests and standalone code. It combines Semgrep static analysis with Google Gemini feedback, then presents findings in a dashboard and, for pull requests, posts a comment on GitHub.

**Why it exists:** Pull request review takes developer time. Important issues can be missed, feedback may be inconsistent, and a newer developer may need more explanation than a short “this is wrong” comment provides. This tool aims to make an initial review faster and provide actionable suggestions. It supports human reviewers; it does not replace their judgment.

**Two ways to review code:**

1. **Pull request review:** GitHub sends a signed webhook when a pull request is opened or updated. The server verifies the signature, queues the work, gets an authorized token for a connected user who can access the repository, fetches the diff, runs Semgrep and Gemini, saves the findings, and posts a GitHub comment.
2. **Quick Check:** A user pastes code or uploads files. The server validates and groups the input, runs static and AI analysis, then saves and displays the review. It can optionally create a branch and pull request from reviewed code.

**Analysis layers:**

- **Semgrep** checks changed code against static rules for recognizable security and correctness patterns. It does not need an AI model to identify a rule match.
- **Gemini** reviews the diff for additional logic and code-quality concerns, such as edge cases, error handling, readability, and maintainability. It is an external service and can be rate-limited or temporarily unavailable.
- The app validates and combines findings from both layers. For pull requests, its score is calculated from finding severity; it is not a score returned by Gemini.
- Repository-aware retrieval selects bounded nearby files and guidance documents from the PR head revision or Quick Check upload. It is lexical retrieval, not a hosted vector database.
- Findings include analyzer source, evidence, cited repository paths and model-reported confidence. Confidence is a heuristic, not a calibrated probability. Users can label findings useful, incorrect or duplicate.
- Evaluation Lab stores owner-scoped labeled examples and review runs, then reports precision, recall, F1 and latency. Metrics depend on the examples and matching method; manually review matches and report dataset size and model variance.

**Core technology:** React and Vite for the dashboard; Node.js and Express for the server/API; PostgreSQL (hosted on Neon in the current deployment); Semgrep CLI; Gemini API; GitHub App webhooks and user authorization; Render hosting.

**Data and ownership:** Connected GitHub credentials are stored encrypted by the application. Review data is associated with a connected user so dashboard visitors see their own reviews. The GitHub App must be installed on repositories it should process, with the required access and webhook events enabled.

**Current limitations to discuss honestly:** Gemini has project/model quotas, and requests can fail with rate limits or timeouts. A static Semgrep result can still be saved when the AI service fails. Depending on the request and findings, an AI-only failure with no static findings may produce an error instead of a review. Do not claim a measured accuracy percentage or time savings unless your team has actually measured it.

### Shared vocabulary

| Term | Simple meaning |
|---|---|
| Pull request (PR) | A proposed set of code changes for review before merging. |
| Diff | The lines added, changed, or removed in a PR. |
| Webhook | An HTTP message GitHub sends to notify the app about an event. |
| HMAC signature | A cryptographic check that helps confirm a webhook came from GitHub and was not altered. |
| Static analysis | Rule-based inspection of code without running it. |
| Finding | One reported issue, with a file, severity, explanation, and sometimes a suggested fix. |
| API quota | A usage limit imposed by an external service such as Gemini. |

## 2. Member study sections

### Member 1 — GitHub App integration and pull request workflow

**Know these topics:** GitHub App vs. a personal access token; app installation and selected-repository access; user authorization; callback URL; pull-request webhooks; HMAC signature verification; fetching a diff; posting a review comment.

**How this project uses them:** A developer authorizes their GitHub account, then installs the GitHub App on repositories to review. GitHub sends `pull_request` events to the configured webhook endpoint. The server checks the delivery signature before accepting it, ignores irrelevant or duplicate deliveries, and queues eligible `opened` or `synchronize` events. A connected user’s authorized token is used to access the repository. After review, the app posts the findings as a comment.

**Code to read:** `dashboard/api/auth.js`, `dashboard/api/github.js`, `trigger/webhook-handler.js`, `fetch-prepare/diff-fetcher.js`, and `delivery/github-comments.js`.

**Be ready to explain:**

- Why does the server verify the webhook signature before processing the payload?
- Why does the app need both GitHub App installation access and a connected user?
- What happens when no connected user can access the repository?
- Which PR actions trigger a review, and why are duplicate webhook deliveries ignored?

**Short explanation to practice:** “GitHub notifies our server when a PR changes. We verify the signed event, retrieve its diff using authorized repository access, analyze it, and send the findings back to the PR.”

### Member 2 — Semgrep, Gemini, and findings quality

**Know these topics:** static analysis vs. AI analysis; prompts and untrusted input; structured JSON output; schema validation; severity; merging results; scoring; quotas, timeouts, and fallback behavior.

**How this project uses them:** Semgrep scans changed code against rules. Its findings are passed as context to Gemini so the model can focus on additional issues instead of repeating static findings. The prompt treats code in the diff as untrusted input. Gemini is asked for a structured JSON array; the server validates and normalizes that output before saving it. For PR reviews, severity penalties contribute to a score (blocking: 15, warning: 7, nitpick: 2, with the score floored at zero). When Gemini is unavailable, Semgrep may still provide findings; the app reports that AI analysis did not complete rather than implying it did.

Repository retrieval now supplies project files and guidance alongside static findings. The dashboard exposes source, evidence, context paths, heuristic confidence, and finding feedback. Evaluation Lab measures labeled cases with precision, recall, F1 and latency; review these metrics manually and state the sample size.

**Code to read:** `review-engine/static-analyzer.js`, `review-engine/llm-analyzer.js`, `review-engine/repository-context.js`, `review-engine/merge-findings.js`, `evaluation/runner.js`, `findings/validate.js`, and `utils/retry.js`.

**Be ready to explain:**

- Why use two analysis methods instead of only Gemini?
- What does Semgrep catch well, and what does it not prove?
- Why validate AI output instead of trusting it directly?
- How does retrieval select repository context and which files are excluded?
- What does the confidence value mean, and why is it not an accuracy measurement?
- How are precision, recall and F1 calculated for the labeled cases?
- What does a Gemini 429 or 504 mean? What can still be saved if Gemini fails?
- Why is the score a heuristic rather than a guarantee of code quality?

**Short explanation to practice:** “Semgrep supplies rule-based checks, repository retrieval supplies project context, and Gemini adds contextual feedback. Users inspect evidence and rate findings; labeled examples let us measure precision, recall and F1.”

### Member 3 — Dashboard and user experience

**Know these topics:** React components and state; API calls; dashboard review list; filtering and search; score/finding display; Quick Check; review detail and diff; charts; responsive and light/dark UI.

**How this project uses them:** The React app gives users a workspace for their reviews. The dashboard displays recent review activity and metrics. Quick Check accepts pasted code or uploaded files. A review detail view shows findings and relevant code changes. Context providers manage GitHub connection and live update state; the UI calls the Express API through a same-origin client. The interface includes search, repository filters, charts, themes, responsive layouts, and focused review navigation.

**Code to read:** `dashboard/client/src/App.jsx`, `dashboard/client/src/components/Dashboard.jsx`, `QuickReview.jsx`, `PRDetail.jsx`, `DiffViewer.jsx`, `StatCards.jsx`, and `dashboard/client/src/context/`.

**Be ready to explain:**

- What can a user do from the dashboard?
- How is Quick Check different from an automatic PR review?
- How does the interface communicate that AI analysis failed or was incomplete?
- How do search and repository filters help users find reviews?
- What design choices make the review details easier to scan?

**Short explanation to practice:** “The dashboard supports review and evaluation: inspect evidence and context, give finding feedback, run Quick Check, and evaluate the reviewer on labeled examples.”

### Member 4 — Backend, database, security, and deployment

**Know these topics:** Express middleware and route groups; PostgreSQL and migrations; connection pooling; user sessions; encrypted tokens; admin MFA; CSRF; security headers; Render environment variables; Neon database; Semgrep installation in the hosted runtime.

**How this project uses them:** Express serves the API and, in production, the built dashboard. PostgreSQL stores reviews, findings, connected GitHub users, sessions, and admin data. Numbered SQL migrations update the schema. The backend uses session cookies, encryption for stored credentials, CSRF protection for state-changing browser requests, rate limits, input validation, and HMAC verification for webhooks. The admin console uses separate accounts and mandatory multi-factor setup. Render hosts the web service; Neon provides PostgreSQL.

**Code to read:** `app.js`, `server.js`, `config/env.js`, `database/connection.js`, `database/migrations/`, `lib/session.js`, `lib/crypto.js`, `lib/csrf.js`, `middleware/security.js`, `admin/`, and `render.yaml`.

**Be ready to explain:**

- Why are secrets configured in the host environment instead of committed to Git?
- What is a database migration, and when does Render run it?
- How are visitor accounts separated from admin accounts?
- What is the difference between Neon and Render in this deployment?
- What happens if Gemini or Semgrep is unavailable?

**Short explanation to practice:** “The backend coordinates GitHub, analysis, storage, and the UI. It validates inputs, protects sessions and credentials, and uses migrations so the hosted PostgreSQL schema stays current.”

## 3. PowerPoint content — 8 slides

Keep slides visual and concise. Use speaker notes for the details from the member sections.

### Slide 1 — AI Code Reviewer

**Subtitle:** Repository-aware, measurable feedback for GitHub pull requests and standalone code
Add the four team members’ names, course/team, and date.

### Slide 2 — The problem

- Code review takes developer time.
- Small issues can be missed when teams are busy.
- Feedback can vary in detail and consistency.
- Newer developers may need actionable explanations.

### Slide 3 — Our solution

- Review PRs automatically when they are opened or updated.
- Run Quick Check on pasted code or uploaded files.
- Combine Semgrep, repository-context retrieval and Gemini feedback.
- Capture user feedback and evaluate with labeled examples.
- Show findings in a dashboard and PR comments.

### Slide 4 — How a PR review works

Use a flow graphic:  
**PR event → signed webhook → diff + repository context retrieval → Semgrep + Gemini → evidence-backed findings → database → dashboard + PR comment**

### Slide 5 — Main features

- GitHub App sign-in and repository installation
- Severity-labelled findings and review score
- Repository context, evidence and feedback labels
- Evaluation Lab with precision, recall, F1 and latency
- Searchable dashboard, review details, charts
- Quick Check for code outside a PR
- Admin console for account/database operations

### Slide 6 — Technology and architecture

- React + Vite dashboard
- Node.js + Express API
- PostgreSQL hosted on Neon
- Semgrep static analysis
- Google Gemini API
- Render web hosting

Show a simple browser → server → analysis services → database → GitHub/dashboard diagram.

### Slide 7 — Demo and example result

Demonstrate one path: connect GitHub → choose Quick Check or open a PR → inspect a finding → view the explanation and suggested fix. Use a real screenshot or live result. Include actual observed behavior only; do not invent accuracy or speed numbers.

### Slide 8 — Limitations, next steps, and conclusion

- External AI quotas and service timeouts can interrupt Gemini analysis.
- Semgrep can still provide static findings when Gemini is unavailable.
- Limitations: lexical retrieval can miss semantically related files; confidence is not calibrated; benchmark scores depend on labeled examples and matching method.
- Next steps: expand and independently label the evaluation set, compare retrieval/no-retrieval runs, calibrate confidence, and add team-level reporting.
- Close with: **“The tool helps developers find and understand potential issues earlier; human review remains important.”**

## 4. Report-writing ideas

Use these as section prompts, not as finished claims. Support statements with screenshots, code references, test outputs, or measured results where possible.

1. **Abstract:** one paragraph on the problem, approach, technologies, and what the prototype delivers.
2. **Introduction:** explain PR reviews and the motivation for faster, more consistent initial feedback.
3. **Problem statement and objectives:** list the specific problems and measurable goals your team set.
4. **Background / related work:** briefly explain code review, static analysis, AI-assisted coding tools, GitHub Apps, and webhooks. Cite reliable sources.
5. **Requirements and use cases:** describe developer, repository, and admin actions; include functional and security requirements.
6. **System design:** include architecture and sequence diagrams for PR review and Quick Check separately. Explain how GitHub, Express, Semgrep, Gemini, PostgreSQL, and React interact.
7. **Implementation:** explain each subsystem: GitHub integration, analysis engine, dashboard, backend/database, security, and deployment. Add selected screenshots and code snippets only when they clarify the design.
8. **Testing and evaluation:** document the tests your team actually ran, test cases, expected/observed behavior, and limitations. If you measure precision, latency, or usability, state the sample size and method. Do not claim accuracy or time saved without measurements.
9. **Security and privacy:** explain webhook signature verification, token/session protection, CSRF protections, user-level review ownership, and handling of source code sent to an external AI service. State which values are stored and where.
10. **Limitations:** discuss model quotas/timeouts, static-analysis coverage, false positives/negatives, supported workflows, and free-hosting constraints observed during testing.
11. **Conclusion and future work:** summarize what works today, what the project demonstrated, and the next improvements.
12. **References and appendices:** cite official GitHub, Gemini, Semgrep, React/Express, PostgreSQL, Neon, and Render docs as appropriate. Append setup steps, test cases, and extra screenshots.

## 5. Suggested official reading

- [GitHub Apps documentation](https://docs.github.com/en/apps)
- [Gemini API models and rate limits](https://ai.google.dev/gemini-api/docs/models) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Semgrep CLI documentation](https://semgrep.dev/docs/)
- [Render native runtimes](https://render.com/docs/native-runtimes)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)

