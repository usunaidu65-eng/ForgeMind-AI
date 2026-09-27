import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";


/* =========================================
   ENVIRONMENT
========================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY was not found.");
  process.exit(1);
}

console.log("✅ Gemini API key loaded.");


/* =========================================
   SERVER + GEMINI
========================================= */

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


/* =========================================
   GEMINI RETRY HELPER
========================================= */

async function generateWithRetry(aiPrompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `🤖 Gemini attempt ${attempt}/${retries}`
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return response;

    } catch (error) {
      console.error(
        `Gemini attempt ${attempt} failed:`,
        error.message
      );

      if (attempt === retries) {
        throw error;
      }

      const waitTime = attempt * 2000;

      console.log(
        `⏳ Retrying in ${waitTime / 1000} seconds...`
      );

      await new Promise((resolve) => {
        setTimeout(resolve, waitTime);
      });
    }
  }
}


/* =========================================
   REQUEST BODY HELPER
========================================= */

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}


/* =========================================
   SERVER
========================================= */

const server = http.createServer(async (req, res) => {

  /* -----------------------------------------
     CORS
  ----------------------------------------- */

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  /* -----------------------------------------
     PREFLIGHT
  ----------------------------------------- */

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }


  /* =========================================
     HEALTH CHECK
  ========================================= */

  if (
    req.method === "GET" &&
    req.url === "/api/health"
  ) {
    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        success: true,
        message: "ForgeMind backend is running."
      })
    );

    return;
  }


  /* =========================================
     AI BUILDER
     POST /api/generate
  ========================================= */

  if (
    req.method === "POST" &&
    req.url === "/api/generate"
  ) {
    try {

      const body = await readRequestBody(req);

      const requestData = JSON.parse(body);

      console.log(
        "Generate request received:",
        requestData
      );


      /* ---------------------------------------
         USER PROMPT
      --------------------------------------- */

      const userPrompt =
        requestData.prompt ||
        requestData.idea ||
        requestData.message ||
        "Create a simple student project.";


      /* ---------------------------------------
         AI BUILDER PROMPT
      --------------------------------------- */

      const aiPrompt = `
You are ForgeMind, an AI project planning assistant.

Create a practical project plan for this user idea:

"${userPrompt}"

Return ONLY valid JSON.

The JSON must have exactly these fields:

{
  "title": "Project title",
  "description": "Short project description",
  "features": [
    "Feature 1",
    "Feature 2",
    "Feature 3",
    "Feature 4",
    "Feature 5"
  ],
  "technologies": [
    "Technology 1",
    "Technology 2",
    "Technology 3",
    "Technology 4"
  ],
  "steps": [
    "Development step 1",
    "Development step 2",
    "Development step 3",
    "Development step 4",
    "Development step 5"
  ],
  "nextStep": "The most important next step for the developer"
}

Rules:
- Keep the response beginner-friendly.
- Make the features specific to the user's project.
- Recommend realistic technologies.
- Give practical development steps.
- Do not use Markdown.
- Do not add explanations outside the JSON.
`;


      /* ---------------------------------------
         GEMINI
      --------------------------------------- */

      const response =
        await generateWithRetry(aiPrompt);

      const aiText = response.text;

      const plan = JSON.parse(aiText);

      console.log(
        "Gemini response received."
      );

      console.log(
        "Structured project plan:",
        plan
      );


      /* ---------------------------------------
         SEND RESPONSE
      --------------------------------------- */

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          success: true,
          message:
            "ForgeMind generated the project plan.",
          result: plan
        })
      );

    } catch (error) {

      console.error(
        "AI generation error:",
        error
      );

      const statusCode =
        error.status === 503
          ? 503
          : 500;

      res.writeHead(statusCode, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            statusCode === 503
              ? "Gemini is temporarily busy. Please try again in a moment."
              : "Failed to generate AI response.",
          error: error.message
        })
      );
    }

    return;
  }


  /* =========================================
     AI IDEA GENERATOR
     POST /api/idea-generator
  ========================================= */

  if (
    req.method === "POST" &&
    req.url === "/api/idea-generator"
  ) {
    try {

      const body = await readRequestBody(req);

      const requestData = JSON.parse(body);

      console.log(
        "Idea Generator request received:",
        requestData
      );


      /* ---------------------------------------
         TOPIC
      --------------------------------------- */

      const topic =
        requestData.topic?.trim() ||
        "AI projects for students";


      /* ---------------------------------------
         IDEA GENERATOR PROMPT
      --------------------------------------- */

      const aiPrompt = `
You are ForgeMind, an AI project idea generator.

The user is interested in:

"${topic}"

Generate exactly 5 practical project ideas.

Return ONLY valid JSON using exactly this structure:

{
  "ideas": [
    {
      "title": "Project title",
      "description": "Short practical description",
      "technologies": [
        "Technology 1",
        "Technology 2",
        "Technology 3"
      ],
      "difficulty": "Beginner"
    }
  ]
}

Rules:
- Generate exactly 5 ideas.
- Make every idea meaningfully different.
- Keep ideas practical and buildable.
- Prefer ideas suitable for students and beginners unless the topic clearly requires a higher level.
- Technologies should match the actual project.
- Keep descriptions concise.
- Do not use Markdown.
- Do not add any text outside the JSON.
`;


      /* ---------------------------------------
         GEMINI
      --------------------------------------- */

      const response =
        await generateWithRetry(aiPrompt);

      const aiText = response.text;

      console.log(
        "Gemini Idea Generator response received."
      );


      /* ---------------------------------------
         PARSE JSON
      --------------------------------------- */

      const result = JSON.parse(aiText);


      /* ---------------------------------------
         VALIDATE
      --------------------------------------- */

      if (
        !result ||
        !Array.isArray(result.ideas) ||
        result.ideas.length !== 5
      ) {
        throw new Error(
          "Gemini did not return exactly 5 project ideas."
        );
      }


      /* ---------------------------------------
         SEND RESPONSE
      --------------------------------------- */

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          success: true,
          message:
            "Project ideas generated successfully.",
          result: result
        })
      );

    } catch (error) {

      console.error(
        "Idea Generator error:",
        error
      );

      const statusCode =
        error.status === 503
          ? 503
          : 500;

      res.writeHead(statusCode, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            statusCode === 503
              ? "Gemini is temporarily busy. Please try again in a moment."
              : "Failed to generate project ideas.",
          error: error.message
        })
      );
    }

    return;
  }

  /* =========================================
   AI PROMPT GENERATOR
========================================= */

if (
  req.method === "POST" &&
  req.url === "/api/prompt-generator"
) {
  try {

    const rawBody = await readRequestBody(req);

    const body = JSON.parse(rawBody);

    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";

    const purpose =
      typeof body.purpose === "string"
        ? body.purpose.trim()
        : "general";

    if (!topic) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message: "Prompt topic is required."
        })
      );

      return;
    }


    const purposeLabels = {
      learning: "Learning",
      coding: "Coding",
      writing: "Writing",
      research: "Research",
      general: "General AI Task"
    };


    const purposeLabel =
      purposeLabels[purpose] ||
      "General AI Task";


    /* -----------------------------------------
       GEMINI PROMPT
    ----------------------------------------- */

    const aiPrompt = `
You are an expert AI prompt engineer.

Create one high-quality, practical and reusable AI prompt based on the user's requirement.

USER REQUIREMENT:
${topic}

PURPOSE:
${purposeLabel}

The generated prompt should:

1. Clearly define the AI's role.
2. Explain the task in a precise way.
3. Include useful context from the user's requirement.
4. Add important constraints or instructions.
5. Clearly describe the expected output.
6. Be easy for a student or beginner to understand and use.
7. Avoid unnecessary wording.
8. Be directly copy-paste ready.

Return ONLY valid JSON.

Use exactly this structure:

{
  "prompt": "A complete copy-paste-ready AI prompt."
}

Do not wrap the JSON in markdown code fences.
`;


    /* -----------------------------------------
       CALL GEMINI
    ----------------------------------------- */

    const response =
      await generateWithRetry(aiPrompt);


    /* -----------------------------------------
       PARSE GEMINI RESPONSE
    ----------------------------------------- */

    let result;

    try {

      if (typeof response.text === "string") {
        result = JSON.parse(response.text);
      } else {
        result = response.text;
      }

    } catch (error) {

      console.error(
        "❌ Failed to parse Prompt Generator JSON:",
        error
      );

      throw new Error(
        "Gemini returned an invalid prompt."
      );
    }


    /* -----------------------------------------
       VALIDATE RESULT
    ----------------------------------------- */

    if (
      !result ||
      typeof result !== "object" ||
      typeof result.prompt !== "string" ||
      !result.prompt.trim()
    ) {
      throw new Error(
        "Gemini returned an invalid prompt."
      );
    }


    /* -----------------------------------------
       SUCCESS RESPONSE
    ----------------------------------------- */

    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        success: true,
        result: {
          prompt: result.prompt.trim()
        }
      })
    );

    return;

  } catch (error) {

    console.error(
      "❌ Prompt Generator failed:",
      error
    );


    const statusCode =
      error?.status === 503
        ? 503
        : 500;


    res.writeHead(statusCode, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        success: false,
        message:
          statusCode === 503
            ? "Gemini is temporarily busy. Please try again in a moment."
            : "ForgeMind could not generate the prompt."
      })
    );

    return;
  }
}

/* =========================================
   AI CODE ASSISTANT
   POST /api/code-assistant
========================================= */

if (
  req.method === "POST" &&
  req.url === "/api/code-assistant"
) {
  try {

    const rawBody =
      await readRequestBody(req);

    const body =
      JSON.parse(rawBody);


    const language =
      typeof body.language === "string"
        ? body.language.trim()
        : "Other";


    const task =
      typeof body.task === "string"
        ? body.task.trim()
        : "";


    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!task) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Code task is required."
        })
      );

      return;
    }


    if (!code) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Code is required."
        })
      );

      return;
    }


    console.log(
      "💻 Code Assistant request received:",
      {
        language,
        task
      }
    );


    /* -----------------------------------------
       GEMINI PROMPT
    ----------------------------------------- */

    const aiPrompt = `
You are ForgeMind, an expert programming assistant
designed to help students and beginner developers.

Analyze the following code and help the user solve
their problem.

Programming language:
${language}

User's request:
${task}

User's code:
${code}

Your job is to:

1. Understand the user's actual problem.
2. Explain the issue in simple beginner-friendly language.
3. Provide corrected or improved code.
4. Give practical step-by-step changes.
5. Mention important coding tips when useful.
6. Do not unnecessarily rewrite working parts of the code.
7. Keep the solution focused on the user's request.

Return ONLY valid JSON.

Use exactly this structure:

{
  "explanation": "Clear explanation of the problem and solution.",
  "correctedCode": "Complete corrected or improved code.",
  "steps": [
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4"
  ],
  "tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ]
}

Rules:

- Keep the explanation beginner-friendly.
- Preserve the original coding language.
- Use realistic and working code.
- Do not use Markdown in the JSON values.
- Do not wrap the JSON in code fences.
- Do not add any text outside the JSON.
`;


    /* -----------------------------------------
       GEMINI
    ----------------------------------------- */

    const response =
      await generateWithRetry(
        aiPrompt
      );


    const aiText =
      response.text;


    console.log(
      "Gemini Code Assistant response received."
    );


    /* -----------------------------------------
       PARSE JSON
    ----------------------------------------- */

    const result =
      JSON.parse(aiText);


    /* -----------------------------------------
       VALIDATE RESULT
    ----------------------------------------- */

    if (
      !result ||
      typeof result !== "object" ||
      typeof result.explanation !== "string" ||
      typeof result.correctedCode !== "string" ||
      !Array.isArray(result.steps) ||
      !Array.isArray(result.tips)
    ) {

      throw new Error(
        "Gemini returned an invalid code-assistant response."
      );

    }


    /* -----------------------------------------
       SEND RESPONSE
    ----------------------------------------- */

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: true,
        message:
          "Code analysis completed successfully.",
        result: result
      })
    );


  } catch (error) {

    console.error(
      "Code Assistant error:",
      error
    );


    const statusCode =
      error?.status === 503
        ? 503
        : 500;


    res.writeHead(statusCode, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: false,
        message:
          statusCode === 503
            ? "Gemini is temporarily busy. Please try again in a moment."
            : "Failed to analyze code.",
        error:
          error.message
      })
    );

  }

  return;
}

/* =========================================
   AI TEXT SUMMARIZER
   POST /api/text-summarizer
========================================= */

if (
  req.method === "POST" &&
  req.url === "/api/text-summarizer"
) {

  try {

    const rawBody =
      await readRequestBody(req);

    const body =
      JSON.parse(rawBody);


    const text =
      typeof body.text === "string"
        ? body.text.trim()
        : "";


    const style =
      typeof body.style === "string"
        ? body.style.trim()
        : "concise";


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!text) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Text to summarize is required."
        })
      );

      return;
    }


    const styleLabels = {

      concise:
        "Concise Summary",

      study:
        "Study Notes",

      bullet:
        "Key Points",

      exam:
        "Exam Revision",

      simple:
        "Simple Explanation"

    };


    const styleLabel =
      styleLabels[style] ||
      "Concise Summary";


    console.log(
      "📝 Text Summarizer request received:",
      {
        style,
        textLength: text.length
      }
    );


    /* -----------------------------------------
       GEMINI PROMPT
    ----------------------------------------- */

    const aiPrompt = `
You are ForgeMind, an AI text summarization assistant
designed for students and general learners.

Summarize the following text.

SUMMARY STYLE:
${styleLabel}

TEXT:
${text}

Your task:

1. Preserve the most important information.
2. Remove repetition and unnecessary details.
3. Keep the meaning accurate.
4. Use clear and easy-to-understand language.
5. Make the summary useful for revision and quick understanding.
6. Do not invent information that is not present in the original text.
7. Keep the output appropriate for the selected summary style.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Clear summarized version of the text.",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3",
    "Important point 4",
    "Important point 5"
  ],
  "takeaway": "One short statement explaining the main idea."
}

Rules:

- Keep the summary concise but useful.
- Generate between 3 and 5 key points.
- Keep key points based only on the provided text.
- Do not use Markdown.
- Do not wrap the JSON in code fences.
- Do not add any text outside the JSON.
`;


    /* -----------------------------------------
       GEMINI
    ----------------------------------------- */

    const response =
      await generateWithRetry(
        aiPrompt
      );


    const aiText =
      response.text;


    console.log(
      "Gemini Text Summarizer response received."
    );


    /* -----------------------------------------
       PARSE JSON
    ----------------------------------------- */

    const result =
      JSON.parse(aiText);


    /* -----------------------------------------
       VALIDATE RESULT
    ----------------------------------------- */

    if (
      !result ||
      typeof result !== "object" ||
      typeof result.summary !== "string" ||
      !Array.isArray(result.keyPoints) ||
      typeof result.takeaway !== "string"
    ) {

      throw new Error(
        "Gemini returned an invalid summarizer response."
      );

    }


    /* -----------------------------------------
       SEND RESPONSE
    ----------------------------------------- */

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: true,
        message:
          "Text summarized successfully.",
        result: {
          summary:
            result.summary.trim(),

          keyPoints:
            result.keyPoints,

          takeaway:
            result.takeaway.trim()
        }
      })
    );


  } catch (error) {

    console.error(
      "Text Summarizer error:",
      error
    );


    const statusCode =
      error?.status === 503
        ? 503
        : 500;


    res.writeHead(statusCode, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: false,
        message:
          statusCode === 503
            ? "Gemini is temporarily busy. Please try again in a moment."
            : "Failed to summarize text.",
        error:
          error.message
      })
    );

  }

  return;
}

/* =========================================
   AI STUDY ASSISTANT
   POST /api/study-assistant
========================================= */

if (
  req.method === "POST" &&
  req.url === "/api/study-assistant"
) {

  try {

    const rawBody =
      await readRequestBody(req);

    const body =
      JSON.parse(rawBody);


    const level =
      typeof body.level === "string"
        ? body.level.trim()
        : "beginner";


    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";


    const request =
      typeof body.request === "string"
        ? body.request.trim()
        : "";


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!topic) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Study topic is required."
        })
      );

      return;
    }


    if (!request) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Study request is required."
        })
      );

      return;
    }


    const levelLabels = {

      beginner:
        "Beginner / BCA Student",

      intermediate:
        "Intermediate",

      advanced:
        "Advanced"

    };


    const levelLabel =
      levelLabels[level] ||
      "Beginner / BCA Student";


    console.log(
      "🎓 Study Assistant request received:",
      {
        level,
        topic
      }
    );


    /* -----------------------------------------
       GEMINI PROMPT
    ----------------------------------------- */

    const aiPrompt = `
You are ForgeMind, an AI study assistant designed
for students.

Create helpful study material for the following topic.

STUDENT LEVEL:
${levelLabel}

TOPIC:
${topic}

STUDENT REQUEST:
${request}

Your task:

1. Explain the topic clearly at the student's level.
2. Focus on the exact request.
3. Use simple language where possible.
4. Include practical examples when useful.
5. Extract the most important concepts.
6. Create useful practice questions.
7. Create a realistic short study plan.
8. Do not invent facts.
9. Keep the content focused and useful for learning.

Return ONLY valid JSON.

Use exactly this structure:

{
  "explanation": "Clear explanation of the topic.",
  "keyConcepts": [
    "Important concept 1",
    "Important concept 2",
    "Important concept 3",
    "Important concept 4",
    "Important concept 5"
  ],
  "questions": [
    "Practice question 1",
    "Practice question 2",
    "Practice question 3",
    "Practice question 4",
    "Practice question 5"
  ],
  "studyPlan": [
    "Study step 1",
    "Study step 2",
    "Study step 3",
    "Study step 4"
  ]
}

Rules:

- Keep it educational and beginner-friendly unless the selected level is higher.
- Make the questions relevant to the topic.
- Keep the study plan practical.
- Do not use Markdown.
- Do not wrap JSON in code fences.
- Do not add any text outside the JSON.
`;


    /* -----------------------------------------
       GEMINI
    ----------------------------------------- */

    const response =
      await generateWithRetry(
        aiPrompt
      );


    const aiText =
      response.text;


    console.log(
      "Gemini Study Assistant response received."
    );


    /* -----------------------------------------
       PARSE JSON
    ----------------------------------------- */

    const result =
      JSON.parse(aiText);


    /* -----------------------------------------
       VALIDATE
    ----------------------------------------- */

    if (
      !result ||
      typeof result !== "object" ||
      typeof result.explanation !== "string" ||
      !Array.isArray(result.keyConcepts) ||
      !Array.isArray(result.questions) ||
      !Array.isArray(result.studyPlan)
    ) {

      throw new Error(
        "Gemini returned an invalid study-assistant response."
      );

    }


    /* -----------------------------------------
       SEND RESPONSE
    ----------------------------------------- */

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: true,
        message:
          "Study help generated successfully.",
        result: {
          explanation:
            result.explanation.trim(),

          keyConcepts:
            result.keyConcepts,

          questions:
            result.questions,

          studyPlan:
            result.studyPlan
        }
      })
    );


  } catch (error) {

    console.error(
      "Study Assistant error:",
      error
    );


    const statusCode =
      error?.status === 503
        ? 503
        : 500;


    res.writeHead(statusCode, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: false,
        message:
          statusCode === 503
            ? "Gemini is temporarily busy. Please try again in a moment."
            : "Failed to generate study help.",
        error:
          error.message
      })
    );

  }

  return;
}

/* =========================================
   AI PROJECT PLANNER
   POST /api/project-planner
========================================= */

if (
  req.method === "POST" &&
  req.url === "/api/project-planner"
) {

  try {

    const rawBody =
      await readRequestBody(req);

    const body =
      JSON.parse(rawBody);


    const level =
      typeof body.level === "string"
        ? body.level.trim()
        : "beginner";


    const type =
      typeof body.type === "string"
        ? body.type.trim()
        : "other";


    const idea =
      typeof body.idea === "string"
        ? body.idea.trim()
        : "";


    const goal =
      typeof body.goal === "string"
        ? body.goal.trim()
        : "";


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!idea) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Project idea is required."
        })
      );

      return;
    }


    if (!goal) {

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      });

      res.end(
        JSON.stringify({
          success: false,
          message:
            "Project goal is required."
        })
      );

      return;
    }


    const levelLabels = {

      beginner:
        "Beginner / Student",

      intermediate:
        "Intermediate",

      advanced:
        "Advanced"

    };


    const typeLabels = {

      web:
        "Web Application",

      mobile:
        "Android App",

      "ai-assistant":
        "AI Assistant",

      automation:
        "AI Automation",

      other:
        "Other"

    };


    const levelLabel =
      levelLabels[level] ||
      "Beginner / Student";


    const typeLabel =
      typeLabels[type] ||
      "Other";


    console.log(
      "🧩 Project Planner request received:",
      {
        level,
        type,
        idea,
        goal
      }
    );


    /* -----------------------------------------
       GEMINI PROMPT
    ----------------------------------------- */

    const aiPrompt = `
You are ForgeMind, an AI project planning assistant
for students and beginner developers.

Create a practical and realistic development roadmap
for the following project.

PROJECT LEVEL:
${levelLabel}

PROJECT TYPE:
${typeLabel}

PROJECT IDEA:
${idea}

MAIN GOAL:
${goal}

Your task:

1. Understand the project idea and goal.
2. Define a clear project title.
3. Give a concise overview.
4. Identify the most important project goals.
5. Recommend realistic technologies.
6. Break the project into logical development milestones.
7. Give useful tasks inside every milestone.
8. Keep the plan realistic for the selected project level.
9. Give one clear first practical step.
10. Do not introduce unnecessary technologies or complexity.

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "Project title",
  "overview": "Short project overview",
  "goals": [
    "Project goal 1",
    "Project goal 2",
    "Project goal 3",
    "Project goal 4"
  ],
  "technologies": [
    "Technology 1",
    "Technology 2",
    "Technology 3",
    "Technology 4"
  ],
  "milestones": [
    {
      "name": "Milestone 1",
      "description": "What this milestone achieves",
      "tasks": [
        "Task 1",
        "Task 2",
        "Task 3"
      ]
    },
    {
      "name": "Milestone 2",
      "description": "What this milestone achieves",
      "tasks": [
        "Task 1",
        "Task 2",
        "Task 3"
      ]
    },
    {
      "name": "Milestone 3",
      "description": "What this milestone achieves",
      "tasks": [
        "Task 1",
        "Task 2",
        "Task 3"
      ]
    },
    {
      "name": "Milestone 4",
      "description": "What this milestone achieves",
      "tasks": [
        "Task 1",
        "Task 2",
        "Task 3"
      ]
    }
  ],
  "firstStep": "The first practical action the developer should take."
}

Rules:

- Keep the roadmap practical.
- Make milestones logically ordered.
- Keep tasks specific and actionable.
- Match technologies to the actual project.
- Do not use Markdown.
- Do not wrap JSON in code fences.
- Do not add text outside the JSON.
`;


    /* -----------------------------------------
       GEMINI
    ----------------------------------------- */

    const response =
      await generateWithRetry(
        aiPrompt
      );


    const aiText =
      response.text;


    console.log(
      "Gemini Project Planner response received."
    );


    /* -----------------------------------------
       PARSE JSON
    ----------------------------------------- */

    const result =
      JSON.parse(aiText);


    /* -----------------------------------------
       VALIDATE
    ----------------------------------------- */

    if (
      !result ||
      typeof result !== "object" ||
      typeof result.title !== "string" ||
      typeof result.overview !== "string" ||
      !Array.isArray(result.goals) ||
      !Array.isArray(result.technologies) ||
      !Array.isArray(result.milestones) ||
      typeof result.firstStep !== "string"
    ) {

      throw new Error(
        "Gemini returned an invalid project-planner response."
      );

    }


    /* -----------------------------------------
       SEND RESPONSE
    ----------------------------------------- */

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: true,
        message:
          "Project plan created successfully.",
        result: {
          title:
            result.title.trim(),

          overview:
            result.overview.trim(),

          goals:
            result.goals,

          technologies:
            result.technologies,

          milestones:
            result.milestones,

          firstStep:
            result.firstStep.trim()
        }
      })
    );


  } catch (error) {

    console.error(
      "Project Planner error:",
      error
    );


    const statusCode =
      error?.status === 503
        ? 503
        : 500;


    res.writeHead(statusCode, {
      "Content-Type":
        "application/json"
    });


    res.end(
      JSON.stringify({
        success: false,
        message:
          statusCode === 503
            ? "Gemini is temporarily busy. Please try again in a moment."
            : "Failed to create project plan.",
        error:
          error.message
      })
    );

  }

  return;
}


  /* =========================================
     UNKNOWN ROUTE
  ========================================= */

  res.writeHead(404, {
    "Content-Type": "application/json"
  });

  res.end(
    JSON.stringify({
      success: false,
      message: "Route not found."
    })
  );
});


/* =========================================
   START SERVER
========================================= */

server.listen(PORT, () => {
  console.log(
    `ForgeMind backend running at http://localhost:${PORT}`
  );
});