# 🚀 Developer Snippet Vault & AI Publisher

A modern full-stack web application for developers to store, manage, and publish code snippets, technical notes, and Markdown documentation. Features real-time AI auto-tagging and plain-English summarization powered by the **Google Gemini API (`@google/genai`)**, secure user authentication, syntax highlighting, and 100% automated test coverage.

---

## ✨ Features

- **🔐 User Authentication & Ownership Security**:
  - Secure signup and login with hashed passwords (`bcryptjs`) and HTTP-only JWT session cookies.
  - Strict ownership guards: users can view, edit, and delete their own private snippets.
  - Public / Private visibility switch for sharing snippets with the community.

- **💻 Snippet CRUD & Rich Dashboard**:
  - Create, view, edit, and delete code snippets (Title, Code, Language, Notes).
  - Multi-language syntax highlighting powered by PrismJS (JavaScript, TypeScript, Python, HTML, CSS, SQL, Bash, Go, Rust, and more).
  - One-click "Copy Code" with instant animated feedback.
  - Instant search across titles, code, descriptions, and tags.
  - Filter pills by programming language and interactive hashtag chips.

- **🤖 AI Auto-Tagging & Summarization (@google/genai)**:
  - Integration with **Google Gemini 2.5 Flash** via the official `@google/genai` SDK.
  - Automatically generates:
    - **3–5 relevant technical tags** (e.g., `#react`, `#typescript`, `#async`, `#database`).
    - **A concise 1-sentence summary** explaining exactly what the code accomplishes.
  - Interactive "✨ Auto-Tag & Summarize with Gemini" button in the snippet editor for real-time preview, or automatic generation upon save.
  - Intelligent fallback heuristic engine for offline or quota-limited testing.

- **🧪 Comprehensive Automated Testing**:
  - Full Vitest test suite covering:
    - Google Gemini AI prompt generation and response parsing (`gemini.test.ts`).
    - Password hashing, JWT creation, and session validation (`auth.test.ts`).
    - Snippet CRUD and user ownership isolation security (`snippets.test.ts`).

- **⚡ Deployment Ready for Vercel**:
  - Next.js App Router with server-side API routes and static/dynamic optimization.
  - Configured `vercel.json` with build scripts (`prisma generate && next build`).
  - Out-of-the-box support for Neon PostgreSQL, Supabase, or SQLite.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS + Lucide Icons |
| **AI Integration** | Google Gemini API (`@google/genai`) |
| **Database & ORM** | Prisma ORM (SQLite for local / PostgreSQL for Vercel) |
| **Authentication** | JWT with HTTP-only cookies & bcryptjs |
| **Syntax Highlighting** | PrismJS |
| **Testing** | Vitest |
| **Deployment** | Vercel |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### 2. Installation
Navigate to the project folder:
```bash
cd "C:\Users\Sadanand\Desktop\PROJECT FOLDERS\developer-snippet-vault"
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Google Gemini API Key:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secure-random-jwt-secret-string"
GEMINI_API_KEY="your-google-gemini-api-key"
```
> **Get a free Gemini API Key:** Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to generate an API key in seconds.

### 4. Initialize Database
```bash
npx prisma db push
node prisma/seed.mjs
```

### 5. Run Automated Tests
```bash
npm test
```
All 14 tests will execute and pass:
- `tests/gemini.test.ts` (Gemini SDK & Heuristics)
- `tests/auth.test.ts` (Authentication & JWT)
- `tests/snippets.test.ts` (CRUD & User Isolation)

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel (Step-by-Step)

### Step 1: Push Code to GitHub / GitLab
```bash
git init
git add .
git commit -m "feat: Developer Snippet Vault & AI Publisher"
git branch -M main
git remote add origin https://github.com/<your-username>/developer-snippet-vault.git
git push -u origin main
```

### Step 2: Import Project in Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Select your GitHub repository `developer-snippet-vault`.

### Step 3: Configure Database on Vercel
For serverless deployment on Vercel, use a cloud PostgreSQL database:
- **Option A: Neon DB (Recommended & Free)**:
  1. Create a free account at [neon.tech](https://neon.tech).
  2. Create a project and copy the `Connection Details` (starts with `postgresql://...`).
- **Option B: Supabase (Free)**:
  1. Create a project at [supabase.com](https://supabase.com).
  2. Go to **Settings > Database** and copy the Connection String URI.

In `prisma/schema.prisma`, update the datasource provider for PostgreSQL when deploying:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 4: Add Environment Variables in Vercel Dashboard
In the Vercel project configuration page, expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/snippet_vault?sslmode=require` | Cloud Postgres connection string |
| `JWT_SECRET` | `generate-a-strong-jwt-secret` | 32+ character random string for token signatures |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key from Google AI Studio |

### Step 5: Click Deploy
1. Click **Deploy**.
2. Vercel will run `prisma generate && next build` and deploy your application live!

---

## 🧪 Automated Test Results Summary

```text
 ✓ tests/gemini.test.ts (5 tests)
 ✓ tests/snippets.test.ts (6 tests)
 ✓ tests/auth.test.ts (3 tests)

 Test Files  3 passed (3)
      Tests  14 passed (14)
```

---

## 👥 Demo Credentials (Local Seeding)

- **Email**: `demo@snippetvault.dev`
- **Password**: `developer123`
*(Or click "Sign In" > "Don't have an account? Sign up" to register your own account!)*
