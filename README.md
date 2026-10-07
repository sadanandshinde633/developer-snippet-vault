# 🚀 Developer Snippet Vault & AI Publisher

A modern full-stack web application for developers to store, manage, and publish code snippets, technical notes, and Markdown documentation. Features real-time AI auto-tagging and plain-English summarization powered by the **Google Gemini API (`@google/genai`)**, secure user authentication, MongoDB Atlas persistence, syntax highlighting, and 100% automated test coverage.

---

## ✨ Features

- **🔐 User Authentication & Ownership Security**:
  - Secure signup and login with hashed passwords (`bcryptjs`) and HTTP-only JWT session cookies.
  - Production OAuth 2.0 social sign-in with **GitHub** and **Google** with safe email-based account linking.
  - Strict ownership guards: users can view, edit, and delete their own private snippets.
  - Public / Private visibility switch for sharing snippets with the community.

- **💻 Snippet CRUD & Rich Dashboard**:
  - Create, view, edit, and delete code snippets (Title, Code, Language, Notes).
  - Multi-language syntax highlighting powered by PrismJS (JavaScript, TypeScript, Python, HTML, CSS, SQL, Bash, Go, Rust, and more).
  - One-click "Copy Code" with instant feedback.
  - Instant search across titles, code, descriptions, and tags.
  - Filter pills by programming language and interactive hashtag chips.

- **🤖 AI Auto-Tagging & Summarization (@google/genai)**:
  - Integration with **Google Gemini API** via the official `@google/genai` SDK.
  - Automatically generates:
    - **3–5 relevant technical tags** (e.g., `#react`, `#typescript`, `#async`, `#database`).
    - **A concise 1-sentence summary** explaining exactly what the code accomplishes.
  - Interactive "✨ Auto-Generate Tags & Summary" button in the snippet editor for real-time preview, or automatic generation upon save.
  - Intelligent fallback heuristic engine for offline or quota-limited resiliency.

- **🧪 Comprehensive Automated Testing**:
  - Full Vitest test suite covering:
    - Google Gemini AI prompt generation and response parsing (`gemini.test.ts`).
    - Password hashing, JWT creation, and session validation (`auth.test.ts`).
    - Snippet CRUD and user ownership isolation security (`snippets.test.ts`).

- **⚡ Deployment Ready for Vercel**:
  - Next.js 14 App Router with server-side API routes and static/dynamic optimization.
  - Native MongoDB Atlas connection with singleton client pooling.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS + Lucide Icons |
| **Database** | MongoDB Atlas (Native `mongodb` driver) |
| **AI Integration** | Google Gemini API (`@google/genai`) |
| **Authentication** | JWT with HTTP-only cookies, bcryptjs, GitHub & Google OAuth |
| **Syntax Highlighting** | PrismJS |
| **Testing** | Vitest |
| **Deployment** | Vercel |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+
- npm or pnpm
- MongoDB Atlas cluster connection string
- Google Gemini API key

### 2. Installation
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY`.

### 4. Run Automated Tests
```bash
npm test
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your `developer-snippet-vault` repository.
3. In **Project Settings → Environment Variables**, configure:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - *(Optional)* `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`
   - *(Optional)* `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   - *(Optional)* `APP_URL`
4. Click **Deploy**. Vercel will build and deploy the Next.js application automatically.
