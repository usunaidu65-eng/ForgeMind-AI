ForgeMind AI

AI se AI ka Nirman — turn ideas into structured AI project plans and practical learning workflows.

ForgeMind AI is a student-focused AI platform built to help users move from an idea to a practical project plan. It combines a frontend experience with a Node.js backend and Gemini-powered structured AI responses.

✨ What ForgeMind AI Can Do

🤖 AI Builder

Turn an idea into a structured project plan containing:

Project title

Description

Suggested features

Recommended technologies

Development steps

Next practical step

💡 AI Idea Generator

Generate practical project ideas from a topic, interest, problem, or area of study.

✍️ Prompt Generator

Convert a rough requirement into a structured AI prompt for:

Learning

Coding

Writing

Research

General AI tasks

💻 Code Assistant

Get:

Code explanations

Improved/corrected code

Step-by-step guidance

Additional tips

📝 Text Summarizer

Turn longer notes or study material into:

A concise summary

Key points

A quick takeaway

🎓 Study Assistant

Generate:

Simple topic explanations

Key concepts

Practice questions

A focused study plan

🧩 Project Planner

Turn a project idea into:

Project goals

Recommended technologies

Development milestones

Tasks

A first practical step

🧠 How It Works

User Idea / Request
        ↓
ForgeMind Frontend
        ↓
Node.js Backend
        ↓
Gemini API
        ↓
Structured JSON Response
        ↓
Frontend Result Rendering

The six AI utility workspaces remain hidden until the corresponding tool is opened, keeping the interface focused and reducing visual clutter.

🛠️ Tech Stack

Layer

Technology

Frontend

HTML, CSS, JavaScript

Backend

Node.js

AI

Google Gemini API

Package Management

npm

Version Control

Git / GitHub

Development

VS Code + Live Server

📁 Project Structure

ForgeMind-AI-Project/
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
└── ForgeMind-AI/
    ├── index.html
    ├── index.css
    ├── script.js
    ├── logo.svg
    └── server/
        └── server.mjs

The local .env file is intentionally excluded from Git because it contains the Gemini API key.

🚀 Run Locally

1. Clone the repository

git clone https://github.com/usunaidu65-eng/ForgeMind-AI.git
cd ForgeMind-AI

2. Install dependencies

npm install

3. Create the environment file

Create a .env file in the project root:

GEMINI_API_KEY=your_gemini_api_key_here

Never commit the .env file or expose the API key publicly.

4. Start the backend

node ForgeMind-AI/server/server.mjs

Backend:

http://localhost:3000

5. Start the frontend

Open:

ForgeMind-AI/index.html

using VS Code Live Server or another local static server.

🔌 Backend API

The current backend exposes these routes:

Method

Endpoint

Purpose

GET

/api/health

Backend health check

POST

/api/generate

AI Builder project plan

POST

/api/idea-generator

Project idea generation

POST

/api/prompt-generator

Prompt generation

POST

/api/code-assistant

Code analysis and guidance

POST

/api/text-summarizer

Text summarization

POST

/api/study-assistant

Study help generation

POST

/api/project-planner

Project roadmap generation

✅ Current QA Status

The working prototype has been checked across:

Mobile layout

Tablet layout

Desktop layout

AI Builder result screen

All 6 AI utility tools

Tool workspace opening behavior

Copy-to-clipboard actions

Structured AI result rendering

🔒 Security Note

Keep secrets on the backend.

The Gemini API key belongs in the root .env file and should never be:

committed to GitHub

pasted into frontend JavaScript

included in screenshots

shared publicly

The repository includes a .gitignore entry for .env and node_modules/.

🗺️ Roadmap

Planned future improvements:

User projects and saved history

Authentication

Android app version

Additional AI utilities

Live deployment

📌 Project Status

Working prototype / portfolio development

ForgeMind AI is currently being developed step by step with a focus on practical AI workflows, student usability, and real project-building experience.

👨‍💻 Repository

GitHub: https://github.com/usunaidu65-eng/ForgeMind-AI

ForgeMind AI · AI se AI ka Nirman