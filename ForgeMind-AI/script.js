const navLinks = document.getElementById("navLinks");
const menuBtn = document.getElementById("menuBtn");

const ideaInput = document.getElementById("ideaInput");
const projectType = document.getElementById("projectType");
const level = document.getElementById("level");
const generateBtn = document.getElementById("generateBtn");

const resultEmpty = document.getElementById("resultEmpty");
const resultLoading = document.getElementById("resultLoading");
const resultContent = document.getElementById("resultContent");

const resultTitle = document.getElementById("resultTitle");
const resultMeta = document.getElementById("resultMeta");
const resultDescription = document.getElementById("resultDescription");

const resultFeatures = document.getElementById("resultFeatures");
const resultTech = document.getElementById("resultTech");
const resultSteps = document.getElementById("resultSteps");
const resultNext = document.getElementById("resultNext");

const toast = document.getElementById("toast");


/* =========================================
   PROJECT TYPE LABELS
========================================= */

const typeLabels = {
  web: "Web Application",
  mobile: "Android App",
  assistant: "AI Assistant",
  automation: "AI Automation"
};


/* =========================================
   MOBILE NAVIGATION
========================================= */

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("mobile-open");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("mobile-open");
  });
});


/* =========================================
   EXAMPLE PROJECT LINKS
========================================= */

document.querySelectorAll(".project-link").forEach((link) => {
  link.addEventListener("click", () => {
    const example = link.dataset.example;

    ideaInput.value = example;

    setTimeout(() => {
      ideaInput.focus();
    }, 250);
  });
});


/* =========================================
   TOAST
========================================= */

function showToast(message) {
  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


/* =========================================
   TITLE FALLBACK
========================================= */

function titleFromIdea(idea) {
  const cleaned = idea.trim().replace(/\s+/g, " ");

  if (!cleaned) {
    return "AI Project Plan";
  }

  const words = cleaned
    .replace(/[^\w\s-]/g, "")
    .split(" ")
    .slice(0, 6);

  return words
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      );
    })
    .join(" ");
}


/* =========================================
   MAIN GENERATE FUNCTION
========================================= */

async function generatePlan() {
  const idea = ideaInput.value.trim();

  if (!idea) {
    showToast("Please enter an idea first.");
    ideaInput.focus();
    return;
  }

  const type = projectType.value;
  const target = level.value;

  const projectRequest = {
    idea: idea,
    projectType: type,
    targetLevel: target
  };


  /* -----------------------------------------
     START LOADING
  ----------------------------------------- */

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  resultEmpty.style.display = "none";
  resultContent.style.display = "none";
  resultLoading.style.display = "block";


  try {
    /* ---------------------------------------
       CALL AI
    --------------------------------------- */

    const plan = await generateAIPlan(projectRequest);

    /* ---------------------------------------
       RENDER RESULT
    --------------------------------------- */

    renderProjectPlan(plan);

    resultLoading.style.display = "none";
    resultEmpty.style.display = "none";
    resultContent.style.display = "block";

    showToast("Project plan generated successfully.");
  } catch (error) {
    console.error("Project generation failed:", error);

    resultLoading.style.display = "none";
    resultContent.style.display = "none";
    resultEmpty.style.display = "block";

    showToast(
      error.message ||
      "ForgeMind could not generate the plan. Please try again."
    );
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "⚡ Generate Project Plan";
  }
}


/* =========================================
   AI GENERATION
========================================= */

async function generateAIPlan(request) {
  const prompt = `
Create a project plan for the following idea:

Project idea: ${request.idea}

Project type: ${typeLabels[request.projectType]}

Target level: ${request.targetLevel}

Return ONLY valid JSON.

Use exactly this structure:

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
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4",
    "Step 5"
  ],
  "nextStep": "The first practical thing the student should do next."
}

Keep the project practical, clear and beginner-friendly.
Do not use markdown.
Do not wrap the JSON in code fences.
`;


  /* -----------------------------------------
     BACKEND REQUEST
  ----------------------------------------- */

  const response = await fetch(
    "/api/generate",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        prompt: prompt
      })
    }
  );


  /* -----------------------------------------
     HTTP ERROR HANDLING
  ----------------------------------------- */

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(
        "Gemini is temporarily busy. Please try again in a moment."
      );
    }

    if (response.status === 500) {
      throw new Error(
        "ForgeMind could not generate the project plan. Please try again."
      );
    }

    throw new Error(
      `Backend returned ${response.status}`
    );
  }


  /* -----------------------------------------
     READ BACKEND RESPONSE
  ----------------------------------------- */

  const data = await response.json();

  console.log("🔥 BACKEND DATA:", data);


  if (!data.success) {
    throw new Error(
      data.message || "AI generation failed."
    );
  }


  /* -----------------------------------------
     GET AI RESULT
  ----------------------------------------- */

  const aiResult = data.result;

  console.log("🔥 GEMINI RESULT:", aiResult);


  /* -----------------------------------------
     PARSE JSON IF NEEDED
  ----------------------------------------- */

  let aiPlan;

  try {
    if (typeof aiResult === "string") {
      aiPlan = JSON.parse(aiResult);
    } else {
      aiPlan = aiResult;
    }
  } catch (error) {
    console.error(
      "❌ Failed to parse Gemini JSON:",
      error
    );

    throw new Error(
      "Gemini returned an invalid project plan."
    );
  }


  console.log("✅ PARSED AI PLAN:", aiPlan);


  /* -----------------------------------------
     VALIDATE RESULT
  ----------------------------------------- */

  if (!aiPlan || typeof aiPlan !== "object") {
    throw new Error(
      "Gemini returned an invalid project plan."
    );
  }


  /* -----------------------------------------
     RETURN CLEAN PLAN
  ----------------------------------------- */

  return {
    title:
      aiPlan.title ||
      titleFromIdea(request.idea),

    description:
      aiPlan.description ||
      "AI-generated project plan.",

    features:
      Array.isArray(aiPlan.features)
        ? aiPlan.features
        : [],

    technologies:
      Array.isArray(aiPlan.technologies)
        ? aiPlan.technologies
        : [],

    steps:
      Array.isArray(aiPlan.steps)
        ? aiPlan.steps
        : [],

    nextStep:
      aiPlan.nextStep ||
      "Start implementing the first development step.",

    projectType:
      typeLabels[request.projectType],

    targetLevel:
      request.targetLevel
  };
}


/* =========================================
   RENDER PROJECT PLAN
========================================= */

function renderProjectPlan(plan) {

  /* -----------------------------------------
     TITLE
  ----------------------------------------- */

  resultTitle.textContent = plan.title;


  /* -----------------------------------------
     META
  ----------------------------------------- */

  resultMeta.textContent =
    `${plan.projectType} • ${plan.targetLevel}`;


  /* -----------------------------------------
     DESCRIPTION
  ----------------------------------------- */

  resultDescription.textContent =
    plan.description;


  /* -----------------------------------------
     FEATURES
  ----------------------------------------- */

  resultFeatures.innerHTML = "";

  plan.features.forEach((feature) => {
    const li = document.createElement("li");

    li.textContent = feature;

    resultFeatures.appendChild(li);
  });


  /* -----------------------------------------
     TECHNOLOGIES
  ----------------------------------------- */

  resultTech.innerHTML = "";

  plan.technologies.forEach((technology) => {
    const chip = document.createElement("span");

    chip.className = "tech";

    chip.textContent = technology;

    resultTech.appendChild(chip);
  });


  /* -----------------------------------------
     DEVELOPMENT STEPS
  ----------------------------------------- */

  resultSteps.innerHTML = "";

  plan.steps.forEach((step) => {
    const li = document.createElement("li");

    li.textContent = step;

    resultSteps.appendChild(li);
  });


  /* -----------------------------------------
     NEXT STEP
  ----------------------------------------- */

  resultNext.textContent =
    plan.nextStep;
}


/* =========================================
   GENERATE BUTTON
========================================= */

generateBtn.addEventListener(
  "click",
  generatePlan
);


/* =========================================
   CTRL + ENTER SHORTCUT
========================================= */

ideaInput.addEventListener(
  "keydown",
  (event) => {

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      generatePlan();
    }
  }
);


/* =========================================
   FORGEMIND INTRO SCREEN
========================================= */

const introScreen =
  document.getElementById("introScreen");

const enterForgeMind =
  document.getElementById("enterForgeMind");


function closeIntro() {

  introScreen.classList.add("hide");

  document.body.style.overflow = "";

  sessionStorage.setItem(
    "forgemindIntroSeen",
    "true"
  );
}


const introSeen =
  sessionStorage.getItem(
    "forgemindIntroSeen"
  );


if (introSeen === "true") {

  introScreen.classList.add("hide");

} else {

  document.body.style.overflow = "hidden";
}


enterForgeMind.addEventListener(
  "click",
  closeIntro
);

/* =========================================
   TOOL WORKSPACE CONTROLLER
========================================= */

function openToolWorkspace(workspaceId, focusElement = null) {

  document
    .querySelectorAll(".tool-workspace")
    .forEach((workspace) => {
      workspace.style.display = "none";
    });

  const workspace =
    document.getElementById(workspaceId);

  if (!workspace) {
    return;
  }

  workspace.style.display = "block";

  workspace.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  if (focusElement) {
    setTimeout(() => {
      focusElement.focus();
    }, 500);
  }
}


/* =========================================
   HIDE ALL TOOL WORKSPACES ON LOAD
========================================= */

document
  .querySelectorAll(".tool-workspace")
  .forEach((workspace) => {
    workspace.style.display = "none";
  });


/* =========================================
   AI IDEA GENERATOR
========================================= */


const ideaGeneratorBtn =
  document.getElementById("ideaGeneratorBtn");

const generateIdeasBtn =
  document.getElementById("generateIdeasBtn");

const ideaTopic =
  document.getElementById("ideaTopic");

const ideaGeneratorLoading =
  document.getElementById("ideaGeneratorLoading");

const ideaResults =
  document.getElementById("ideaResults");


/* Open Idea Generator Workspace */

ideaGeneratorBtn.addEventListener("click", () => {
  openToolWorkspace(
    "ideaGeneratorWorkspace",
    ideaTopic
  );
});


/* Generate Ideas */

async function generateProjectIdeas() {
  const topic = ideaTopic.value.trim();

  if (!topic) {
    showToast("Please enter a topic or interest first.");
    ideaTopic.focus();
    return;
  }

  generateIdeasBtn.disabled = true;
  generateIdeasBtn.textContent = "Generating...";

  ideaGeneratorLoading.style.display = "block";
  ideaResults.style.display = "none";
  ideaResults.innerHTML = "";

  try {
    const response = await fetch(
      "/api/idea-generator",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: topic
        })
      }
    );

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error(
          "Gemini is temporarily busy. Please try again in a moment."
        );
      }

      throw new Error(
        `Backend returned ${response.status}`
      );
    }

    const data = await response.json();

    console.log("💡 IDEA GENERATOR DATA:", data);

    if (!data.success) {
      throw new Error(
        data.message || "Idea generation failed."
      );
    }

    renderIdeaResults(data.result.ideas);

    showToast(
      "5 project ideas generated successfully."
    );

  } catch (error) {
    console.error(
      "Idea Generator failed:",
      error
    );

    showToast(
      error.message ||
      "Could not generate project ideas."
    );

  } finally {
    ideaGeneratorLoading.style.display = "none";

    generateIdeasBtn.disabled = false;
    generateIdeasBtn.textContent =
      "⚡ Generate Project Ideas";
  }
}


/* Render Ideas */
function renderIdeaResults(ideas) {
  ideaResults.innerHTML = "";

  ideas.forEach((idea, index) => {
    const card = document.createElement("div");
    card.className = "idea-result";

    const title = document.createElement("h4");
    title.textContent = `${index + 1}. ${idea.title}`;

    const description = document.createElement("p");
    description.textContent = idea.description;

    const difficulty = document.createElement("p");
    difficulty.textContent = `Difficulty: ${idea.difficulty}`;
    difficulty.style.marginTop = "8px";

    const techList = document.createElement("div");
    techList.className = "idea-tech";

    if (Array.isArray(idea.technologies)) {
      idea.technologies.forEach((technology) => {
        const chip = document.createElement("span");

        chip.className = "tech";
        chip.textContent = technology;

        techList.appendChild(chip);
      });
    }

    /* -----------------------------------------
       USE THIS IDEA BUTTON
    ----------------------------------------- */

    const useButton = document.createElement("button");

    useButton.type = "button";
    useButton.className = "use-idea-btn";
    useButton.textContent = "Use this idea →";

    useButton.addEventListener("click", () => {
      const selectedIdea =
        `${idea.title}: ${idea.description}`;

      ideaInput.value = selectedIdea;

      document
        .getElementById("builder")
        .scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      setTimeout(() => {
        ideaInput.focus();
      }, 600);

      showToast(
        `"${idea.title}" added to AI Builder.`
      );
    });

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(difficulty);
    card.appendChild(techList);
    card.appendChild(useButton);

    ideaResults.appendChild(card);
  });

  ideaResults.style.display = "grid";
}

    

/* Button */

generateIdeasBtn.addEventListener(
  "click",
  generateProjectIdeas
);


/* Enter Key */

ideaTopic.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateProjectIdeas();
  }
});

/* =========================================
   AI PROMPT GENERATOR
========================================= */

const promptGeneratorBtn = document.getElementById("promptGeneratorBtn");
const generatePromptBtn = document.getElementById("generatePromptBtn");

const promptTopic = document.getElementById("promptTopic");
const promptPurpose = document.getElementById("promptPurpose");

const promptGeneratorLoading = document.getElementById(
  "promptGeneratorLoading"
);

const promptResult = document.getElementById("promptResult");
const generatedPrompt = document.getElementById("generatedPrompt");
const copyPromptBtn = document.getElementById("copyPromptBtn");


/* OPEN PROMPT GENERATOR */

if (promptGeneratorBtn) {
  promptGeneratorBtn.addEventListener("click", () => {
    openToolWorkspace(
      "promptGeneratorWorkspace",
      promptTopic
    );
  });
}


/* GENERATE PROMPT */

if (generatePromptBtn) {
  generatePromptBtn.addEventListener("click", generatePrompt);
}


async function generatePrompt() {

  const topic = promptTopic?.value.trim();
  const purpose = promptPurpose?.value;

  if (!topic) {
    showToast("Please describe what you want the AI to do.");
    promptTopic?.focus();
    return;
  }

  generatePromptBtn.disabled = true;
  generatePromptBtn.textContent = "Generating...";

  if (promptResult) {
    promptResult.style.display = "none";
  }

  if (promptGeneratorLoading) {
    promptGeneratorLoading.style.display = "block";
  }

  try {

    const response = await fetch(
      "/api/prompt-generator",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          purpose
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Prompt generation failed."
      );
    }

    if (
      !data.result ||
      typeof data.result.prompt !== "string"
    ) {
      throw new Error(
        "ForgeMind received an invalid prompt response."
      );
    }

    if (generatedPrompt) {
      generatedPrompt.textContent = data.result.prompt;
    }

    if (promptGeneratorLoading) {
      promptGeneratorLoading.style.display = "none";
    }

    if (promptResult) {
      promptResult.style.display = "block";
    }

    showToast("Prompt generated successfully.");

  } catch (error) {

    if (promptGeneratorLoading) {
      promptGeneratorLoading.style.display = "none";
    }

    showToast(
      error.message ||
      "ForgeMind could not generate the prompt. Please try again."
    );

  } finally {

    generatePromptBtn.disabled = false;
    generatePromptBtn.textContent = "⚡ Generate Prompt";
  }
}


/* COPY GENERATED PROMPT */

if (copyPromptBtn) {

  copyPromptBtn.addEventListener("click", async () => {

    const promptText =
      generatedPrompt?.textContent.trim();

    if (!promptText) {
      showToast("There is no prompt to copy yet.");
      return;
    }

    try {

      await navigator.clipboard.writeText(promptText);

      const originalText = copyPromptBtn.textContent;

      copyPromptBtn.textContent = "✓ Copied";

      showToast("Prompt copied to clipboard.");

      setTimeout(() => {
        copyPromptBtn.textContent = originalText;
      }, 1600);

    } catch (error) {

      showToast(
        "Could not copy the prompt. Please copy it manually."
      );

    }
  });

}

/* =========================================
   AI CODE ASSISTANT
========================================= */

const codeAssistantBtn =
  document.getElementById("codeAssistantBtn");

const generateCodeHelpBtn =
  document.getElementById("generateCodeHelpBtn");

const codeLanguage =
  document.getElementById("codeLanguage");

const codeTask =
  document.getElementById("codeTask");

const codeInput =
  document.getElementById("codeInput");

const codeAssistantLoading =
  document.getElementById("codeAssistantLoading");

const codeResult =
  document.getElementById("codeResult");

const codeExplanation =
  document.getElementById("codeExplanation");

const generatedCode =
  document.getElementById("generatedCode");

const codeSteps =
  document.getElementById("codeSteps");

const codeTips =
  document.getElementById("codeTips");

const copyCodeBtn =
  document.getElementById("copyCodeBtn");


/* -----------------------------------------
   OPEN CODE ASSISTANT
----------------------------------------- */

if (codeAssistantBtn) {

  codeAssistantBtn.addEventListener("click", () => {

    openToolWorkspace(
      "codeAssistantWorkspace",
      codeTask
    );

  });

}


/* -----------------------------------------
   GENERATE CODE HELP
----------------------------------------- */

if (generateCodeHelpBtn) {

  generateCodeHelpBtn.addEventListener(
    "click",
    generateCodeHelp
  );

}


async function generateCodeHelp() {

  const language =
    codeLanguage?.value || "Other";

  const task =
    codeTask?.value.trim();

  const code =
    codeInput?.value.trim();


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!task) {

    showToast(
      "Please describe what you need help with."
    );

    codeTask?.focus();

    return;
  }


  if (!code) {

    showToast(
      "Please paste your code first."
    );

    codeInput?.focus();

    return;
  }


  /* -----------------------------------------
     START LOADING
  ----------------------------------------- */

  generateCodeHelpBtn.disabled = true;

  generateCodeHelpBtn.textContent =
    "Analyzing...";

  if (codeResult) {
    codeResult.style.display = "none";
  }

  if (codeAssistantLoading) {
    codeAssistantLoading.style.display =
      "block";
  }


  try {

    /* ---------------------------------------
       BACKEND REQUEST
    --------------------------------------- */

    const response = await fetch(
      "/api/code-assistant",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          language,
          task,
          code
        })
      }
    );


    /* ---------------------------------------
       HTTP ERROR
    --------------------------------------- */

    if (!response.ok) {

      if (response.status === 503) {

        throw new Error(
          "Gemini is temporarily busy. Please try again in a moment."
        );

      }

      throw new Error(
        `Backend returned ${response.status}`
      );
    }


    /* ---------------------------------------
       RESPONSE
    --------------------------------------- */

    const data =
      await response.json();


    console.log(
      "💻 CODE ASSISTANT DATA:",
      data
    );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Code analysis failed."
      );

    }


    const result =
      data.result;


    /* ---------------------------------------
       VALIDATE
    --------------------------------------- */

    if (
      !result ||
      typeof result !== "object"
    ) {

      throw new Error(
        "ForgeMind received an invalid code response."
      );

    }


    /* ---------------------------------------
       EXPLANATION
    --------------------------------------- */

    if (codeExplanation) {

      codeExplanation.textContent =
        result.explanation ||
        "No explanation was provided.";

    }


    /* ---------------------------------------
       GENERATED CODE
    --------------------------------------- */

    if (generatedCode) {

      generatedCode.textContent =
        result.correctedCode ||
        result.suggestedCode ||
        "No code solution was provided.";

    }


    /* ---------------------------------------
       STEPS
    --------------------------------------- */

    if (codeSteps) {

      codeSteps.innerHTML = "";

      if (Array.isArray(result.steps)) {

        result.steps.forEach((step) => {

          const li =
            document.createElement("li");

          li.textContent = step;

          codeSteps.appendChild(li);

        });

      }

    }


    /* ---------------------------------------
       TIPS
    --------------------------------------- */

    if (codeTips) {

      codeTips.innerHTML = "";

      if (Array.isArray(result.tips)) {

        result.tips.forEach((tip) => {

          const li =
            document.createElement("li");

          li.textContent = tip;

          codeTips.appendChild(li);

        });

      }

    }


    /* ---------------------------------------
       SHOW RESULT
    --------------------------------------- */

    if (codeAssistantLoading) {

      codeAssistantLoading.style.display =
        "none";

    }

    if (codeResult) {

      codeResult.style.display =
        "block";

    }


    showToast(
      "Code analysis completed successfully."
    );


  } catch (error) {

    console.error(
      "Code Assistant failed:",
      error
    );


    if (codeAssistantLoading) {

      codeAssistantLoading.style.display =
        "none";

    }


    showToast(
      error.message ||
      "ForgeMind could not analyze the code."
    );


  } finally {

    generateCodeHelpBtn.disabled =
      false;

    generateCodeHelpBtn.textContent =
      "⚡ Analyze Code";

  }

}


/* -----------------------------------------
   COPY CODE
----------------------------------------- */

if (copyCodeBtn) {

  copyCodeBtn.addEventListener(
    "click",
    async () => {

      const code =
        generatedCode?.textContent.trim();


      if (!code) {

        showToast(
          "There is no code to copy yet."
        );

        return;
      }


      try {

        await navigator.clipboard.writeText(
          code
        );


        const originalText =
          copyCodeBtn.textContent;


        copyCodeBtn.textContent =
          "✓ Copied";


        showToast(
          "Code copied to clipboard."
        );


        setTimeout(() => {

          copyCodeBtn.textContent =
            originalText;

        }, 1600);


      } catch (error) {

        showToast(
          "Could not copy the code."
        );

      }

    }
  );

}

/* =========================================
   AI TEXT SUMMARIZER
========================================= */

const textSummarizerBtn =
  document.getElementById("textSummarizerBtn");

const generateSummaryBtn =
  document.getElementById("generateSummaryBtn");

const summaryPurpose =
  document.getElementById("summaryPurpose");

const summaryInput =
  document.getElementById("summaryInput");

const textSummarizerLoading =
  document.getElementById("textSummarizerLoading");

const summaryResult =
  document.getElementById("summaryResult");

const generatedSummary =
  document.getElementById("generatedSummary");

const summaryKeyPoints =
  document.getElementById("summaryKeyPoints");

const summaryTakeaway =
  document.getElementById("summaryTakeaway");

const copySummaryBtn =
  document.getElementById("copySummaryBtn");


/* -----------------------------------------
   OPEN SUMMARIZER
----------------------------------------- */

if (textSummarizerBtn) {

  textSummarizerBtn.addEventListener(
    "click",
    () => {

      openToolWorkspace(
        "textSummarizerWorkspace",
        summaryInput
      );

    }
  );

}


/* -----------------------------------------
   GENERATE SUMMARY
----------------------------------------- */

if (generateSummaryBtn) {

  generateSummaryBtn.addEventListener(
    "click",
    generateSummary
  );

}


async function generateSummary() {

  const text =
    summaryInput?.value.trim();

  const style =
    summaryPurpose?.value || "concise";


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!text) {

    showToast(
      "Please paste some text to summarize."
    );

    summaryInput?.focus();

    return;
  }


  /* -----------------------------------------
     START LOADING
  ----------------------------------------- */

  generateSummaryBtn.disabled = true;

  generateSummaryBtn.textContent =
    "Summarizing...";


  if (summaryResult) {
    summaryResult.style.display = "none";
  }


  if (textSummarizerLoading) {
    textSummarizerLoading.style.display =
      "block";
  }


  try {

    /* ---------------------------------------
       BACKEND REQUEST
    --------------------------------------- */

    const response =
      await fetch(
        "/api/text-summarizer",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            text,
            style
          })
        }
      );


    /* ---------------------------------------
       HTTP ERROR
    --------------------------------------- */

    if (!response.ok) {

      if (response.status === 503) {

        throw new Error(
          "Gemini is temporarily busy. Please try again in a moment."
        );

      }

      throw new Error(
        `Backend returned ${response.status}`
      );
    }


    /* ---------------------------------------
       READ RESPONSE
    --------------------------------------- */

    const data =
      await response.json();


    console.log(
      "📝 TEXT SUMMARIZER DATA:",
      data
    );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Text summarization failed."
      );

    }


    const result =
      data.result;


    /* ---------------------------------------
       VALIDATE
    --------------------------------------- */

    if (
      !result ||
      typeof result !== "object"
    ) {

      throw new Error(
        "ForgeMind received an invalid summary response."
      );

    }


    /* ---------------------------------------
       SUMMARY
    --------------------------------------- */

    if (generatedSummary) {

      generatedSummary.textContent =
        result.summary ||
        "No summary was generated.";

    }


    /* ---------------------------------------
       KEY POINTS
    --------------------------------------- */

    if (summaryKeyPoints) {

      summaryKeyPoints.innerHTML = "";

      if (
        Array.isArray(result.keyPoints)
      ) {

        result.keyPoints.forEach(
          (point) => {

            const li =
              document.createElement("li");

            li.textContent = point;

            summaryKeyPoints.appendChild(
              li
            );

          }
        );

      }

    }


    /* ---------------------------------------
       TAKEAWAY
    --------------------------------------- */

    if (summaryTakeaway) {

      summaryTakeaway.textContent =
        result.takeaway ||
        "No takeaway was provided.";

    }


    /* ---------------------------------------
       SHOW RESULT
    --------------------------------------- */

    if (textSummarizerLoading) {

      textSummarizerLoading.style.display =
        "none";

    }


    if (summaryResult) {

      summaryResult.style.display =
        "block";

    }


    showToast(
      "Text summarized successfully."
    );


  } catch (error) {

    console.error(
      "Text Summarizer failed:",
      error
    );


    if (textSummarizerLoading) {

      textSummarizerLoading.style.display =
        "none";

    }


    showToast(
      error.message ||
      "ForgeMind could not summarize the text."
    );


  } finally {

    generateSummaryBtn.disabled =
      false;

    generateSummaryBtn.textContent =
      "⚡ Summarize Text";

  }

}


/* -----------------------------------------
   COPY SUMMARY
----------------------------------------- */

if (copySummaryBtn) {

  copySummaryBtn.addEventListener(
    "click",
    async () => {

      const summary =
        generatedSummary?.textContent.trim();


      if (!summary) {

        showToast(
          "There is no summary to copy yet."
        );

        return;
      }


      try {

        await navigator.clipboard.writeText(
          summary
        );


        const originalText =
          copySummaryBtn.textContent;


        copySummaryBtn.textContent =
          "✓ Copied";


        showToast(
          "Summary copied to clipboard."
        );


        setTimeout(() => {

          copySummaryBtn.textContent =
            originalText;

        }, 1600);


      } catch (error) {

        showToast(
          "Could not copy the summary."
        );

      }

    }
  );

}

/* =========================================
   AI STUDY ASSISTANT
========================================= */

const studyAssistantBtn =
  document.getElementById("studyAssistantBtn");

const generateStudyBtn =
  document.getElementById("generateStudyBtn");

const studyLevel =
  document.getElementById("studyLevel");

const studyTopic =
  document.getElementById("studyTopic");

const studyRequest =
  document.getElementById("studyRequest");

const studyAssistantLoading =
  document.getElementById("studyAssistantLoading");

const studyResult =
  document.getElementById("studyResult");

const studyExplanation =
  document.getElementById("studyExplanation");

const studyConcepts =
  document.getElementById("studyConcepts");

const studyQuestions =
  document.getElementById("studyQuestions");

const studyPlan =
  document.getElementById("studyPlan");

const copyStudyBtn =
  document.getElementById("copyStudyBtn");


/* -----------------------------------------
   OPEN STUDY ASSISTANT
----------------------------------------- */

if (studyAssistantBtn) {

  studyAssistantBtn.addEventListener(
    "click",
    () => {

      openToolWorkspace(
        "studyAssistantWorkspace",
        studyTopic
      );

    }
  );

}


/* -----------------------------------------
   GENERATE STUDY HELP
----------------------------------------- */

if (generateStudyBtn) {

  generateStudyBtn.addEventListener(
    "click",
    generateStudyHelp
  );

}


async function generateStudyHelp() {

  const level =
    studyLevel?.value || "beginner";

  const topic =
    studyTopic?.value.trim();

  const request =
    studyRequest?.value.trim();


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!topic) {

    showToast(
      "Please enter a study topic."
    );

    studyTopic?.focus();

    return;
  }


  if (!request) {

    showToast(
      "Please describe what kind of study help you need."
    );

    studyRequest?.focus();

    return;
  }


  /* -----------------------------------------
     START LOADING
  ----------------------------------------- */

  generateStudyBtn.disabled = true;

  generateStudyBtn.textContent =
    "Generating...";


  if (studyResult) {
    studyResult.style.display = "none";
  }


  if (studyAssistantLoading) {
    studyAssistantLoading.style.display =
      "block";
  }


  try {

    /* ---------------------------------------
       BACKEND REQUEST
    --------------------------------------- */

    const response =
      await fetch(
        "/api/study-assistant",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            level,
            topic,
            request
          })
        }
      );


    /* ---------------------------------------
       HTTP ERROR
    --------------------------------------- */

    if (!response.ok) {

      if (response.status === 503) {

        throw new Error(
          "Gemini is temporarily busy. Please try again in a moment."
        );

      }

      throw new Error(
        `Backend returned ${response.status}`
      );
    }


    /* ---------------------------------------
       READ RESPONSE
    --------------------------------------- */

    const data =
      await response.json();


    console.log(
      "🎓 STUDY ASSISTANT DATA:",
      data
    );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Study assistance failed."
      );

    }


    const result =
      data.result;


    /* ---------------------------------------
       VALIDATE
    --------------------------------------- */

    if (
      !result ||
      typeof result !== "object"
    ) {

      throw new Error(
        "ForgeMind received an invalid study response."
      );

    }


    /* ---------------------------------------
       EXPLANATION
    --------------------------------------- */

    if (studyExplanation) {

      studyExplanation.textContent =
        result.explanation ||
        "No explanation was generated.";

    }


    /* ---------------------------------------
       KEY CONCEPTS
    --------------------------------------- */

    if (studyConcepts) {

      studyConcepts.innerHTML = "";

      if (
        Array.isArray(result.keyConcepts)
      ) {

        result.keyConcepts.forEach(
          (concept) => {

            const li =
              document.createElement("li");

            li.textContent = concept;

            studyConcepts.appendChild(
              li
            );

          }
        );

      }

    }


    /* ---------------------------------------
       QUESTIONS
    --------------------------------------- */

    if (studyQuestions) {

      studyQuestions.innerHTML = "";

      if (
        Array.isArray(result.questions)
      ) {

        result.questions.forEach(
          (question) => {

            const li =
              document.createElement("li");

            li.textContent = question;

            studyQuestions.appendChild(
              li
            );

          }
        );

      }

    }


    /* ---------------------------------------
       STUDY PLAN
    --------------------------------------- */

    if (studyPlan) {

      studyPlan.innerHTML = "";

      if (
        Array.isArray(result.studyPlan)
      ) {

        result.studyPlan.forEach(
          (step) => {

            const li =
              document.createElement("li");

            li.textContent = step;

            studyPlan.appendChild(
              li
            );

          }
        );

      }

    }


    /* ---------------------------------------
       SHOW RESULT
    --------------------------------------- */

    if (studyAssistantLoading) {

      studyAssistantLoading.style.display =
        "none";

    }


    if (studyResult) {

      studyResult.style.display =
        "block";

    }


    showToast(
      "Study help generated successfully."
    );


  } catch (error) {

    console.error(
      "Study Assistant failed:",
      error
    );


    if (studyAssistantLoading) {

      studyAssistantLoading.style.display =
        "none";

    }


    showToast(
      error.message ||
      "ForgeMind could not generate study help."
    );


  } finally {

    generateStudyBtn.disabled =
      false;

    generateStudyBtn.textContent =
      "⚡ Generate Study Help";

  }

}


/* -----------------------------------------
   COPY STUDY HELP
----------------------------------------- */

if (copyStudyBtn) {

  copyStudyBtn.addEventListener(
    "click",
    async () => {

      const explanation =
        studyExplanation?.textContent.trim();

      const concepts =
        Array.from(
          studyConcepts?.querySelectorAll("li") || []
        )
        .map((item) => `• ${item.textContent}`)
        .join("\n");

      const questions =
        Array.from(
          studyQuestions?.querySelectorAll("li") || []
        )
        .map((item, index) =>
          `${index + 1}. ${item.textContent}`
        )
        .join("\n");

      const plan =
        Array.from(
          studyPlan?.querySelectorAll("li") || []
        )
        .map((item, index) =>
          `${index + 1}. ${item.textContent}`
        )
        .join("\n");


      const studyText = `
EXPLANATION

${explanation}

KEY CONCEPTS

${concepts}

PRACTICE QUESTIONS

${questions}

STUDY PLAN

${plan}
`.trim();


      if (!studyText) {

        showToast(
          "There is no study help to copy yet."
        );

        return;
      }


      try {

        await navigator.clipboard.writeText(
          studyText
        );


        const originalText =
          copyStudyBtn.textContent;


        copyStudyBtn.textContent =
          "✓ Copied";


        showToast(
          "Study help copied to clipboard."
        );


        setTimeout(() => {

          copyStudyBtn.textContent =
            originalText;

        }, 1600);


      } catch (error) {

        showToast(
          "Could not copy study help."
        );

      }

    }
  );

}

/* =========================================
   AI PROJECT PLANNER
========================================= */

const projectPlannerBtn =
  document.getElementById("projectPlannerBtn");

const generatePlanBtn =
  document.getElementById("generatePlanBtn");

const plannerLevel =
  document.getElementById("plannerLevel");

const plannerType =
  document.getElementById("plannerType");

const plannerIdea =
  document.getElementById("plannerIdea");

const plannerGoal =
  document.getElementById("plannerGoal");

const projectPlannerLoading =
  document.getElementById("projectPlannerLoading");

const plannerResult =
  document.getElementById("plannerResult");

const plannerTitle =
  document.getElementById("plannerTitle");

const plannerOverview =
  document.getElementById("plannerOverview");

const plannerGoals =
  document.getElementById("plannerGoals");

const plannerTechnologies =
  document.getElementById("plannerTechnologies");

const plannerMilestones =
  document.getElementById("plannerMilestones");

const plannerFirstStep =
  document.getElementById("plannerFirstStep");

const copyPlannerBtn =
  document.getElementById("copyPlannerBtn");


/* -----------------------------------------
   OPEN PROJECT PLANNER
----------------------------------------- */

if (projectPlannerBtn) {

  projectPlannerBtn.addEventListener(
    "click",
    () => {

      openToolWorkspace(
        "projectPlannerWorkspace",
        plannerIdea
      );

    }
  );

}


/* -----------------------------------------
   GENERATE PROJECT PLAN
----------------------------------------- */

if (generatePlanBtn) {

  generatePlanBtn.addEventListener(
    "click",
    generateProjectRoadmap
  );

}


async function generateProjectRoadmap() {

  const level =
    plannerLevel?.value || "beginner";

  const type =
    plannerType?.value || "other";

  const idea =
    plannerIdea?.value.trim();

  const goal =
    plannerGoal?.value.trim();


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!idea) {

    showToast(
      "Please enter your project idea."
    );

    plannerIdea?.focus();

    return;
  }


  if (!goal) {

    showToast(
      "Please describe your main project goal."
    );

    plannerGoal?.focus();

    return;
  }


  /* -----------------------------------------
     START LOADING
  ----------------------------------------- */

  generatePlanBtn.disabled = true;

  generatePlanBtn.textContent =
    "Planning...";


  if (plannerResult) {
    plannerResult.style.display = "none";
  }


  if (projectPlannerLoading) {
    projectPlannerLoading.style.display =
      "block";
  }


  try {

    /* ---------------------------------------
       BACKEND REQUEST
    --------------------------------------- */

    const response =
      await fetch(
        "/api/project-planner",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            level,
            type,
            idea,
            goal
          })
        }
      );


    /* ---------------------------------------
       HTTP ERROR
    --------------------------------------- */

    if (!response.ok) {

      if (response.status === 503) {

        throw new Error(
          "Gemini is temporarily busy. Please try again in a moment."
        );

      }

      throw new Error(
        `Backend returned ${response.status}`
      );
    }


    /* ---------------------------------------
       READ RESPONSE
    --------------------------------------- */

    const data =
      await response.json();


    console.log(
      "🧩 PROJECT PLANNER DATA:",
      data
    );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Project planning failed."
      );

    }


    const result =
      data.result;


    /* ---------------------------------------
       VALIDATE
    --------------------------------------- */

    if (
      !result ||
      typeof result !== "object"
    ) {

      throw new Error(
        "ForgeMind received an invalid project plan."
      );

    }


    /* ---------------------------------------
       TITLE
    --------------------------------------- */

    if (plannerTitle) {

      plannerTitle.textContent =
        result.title ||
        "Project Plan";

    }


    /* ---------------------------------------
       OVERVIEW
    --------------------------------------- */

    if (plannerOverview) {

      plannerOverview.textContent =
        result.overview ||
        "No project overview was generated.";

    }


    /* ---------------------------------------
       GOALS
    --------------------------------------- */

    if (plannerGoals) {

      plannerGoals.innerHTML = "";

      if (
        Array.isArray(result.goals)
      ) {

        result.goals.forEach(
          (goalItem) => {

            const li =
              document.createElement("li");

            li.textContent = goalItem;

            plannerGoals.appendChild(
              li
            );

          }
        );

      }

    }


    /* ---------------------------------------
       TECHNOLOGIES
    --------------------------------------- */

    if (plannerTechnologies) {

      plannerTechnologies.innerHTML = "";

      if (
        Array.isArray(result.technologies)
      ) {

        result.technologies.forEach(
          (technology) => {

            const chip =
              document.createElement("span");

            chip.className = "tech";

            chip.textContent =
              technology;

            plannerTechnologies.appendChild(
              chip
            );

          }
        );

      }

    }


    /* ---------------------------------------
       MILESTONES
    --------------------------------------- */

    if (plannerMilestones) {

      plannerMilestones.innerHTML = "";

      if (
        Array.isArray(result.milestones)
      ) {

        result.milestones.forEach(
          (milestone, index) => {

            const milestoneBox =
              document.createElement("div");

            milestoneBox.className =
              "planner-milestone";


            const heading =
              document.createElement("h4");

            heading.textContent =
              `${index + 1}. ${milestone.name}`;


            const description =
              document.createElement("p");

            description.textContent =
              milestone.description || "";


            milestoneBox.appendChild(
              heading
            );

            milestoneBox.appendChild(
              description
            );


            if (
              Array.isArray(milestone.tasks)
            ) {

              const taskList =
                document.createElement("ul");

              milestone.tasks.forEach(
                (task) => {

                  const li =
                    document.createElement("li");

                  li.textContent = task;

                  taskList.appendChild(
                    li
                  );

                }
              );

              milestoneBox.appendChild(
                taskList
              );

            }


            plannerMilestones.appendChild(
              milestoneBox
            );

          }
        );

      }

    }


    /* ---------------------------------------
       FIRST STEP
    --------------------------------------- */

    if (plannerFirstStep) {

      plannerFirstStep.textContent =
        result.firstStep ||
        "Start by defining the first milestone.";

    }


    /* ---------------------------------------
       SHOW RESULT
    --------------------------------------- */

    if (projectPlannerLoading) {

      projectPlannerLoading.style.display =
        "none";

    }


    if (plannerResult) {

      plannerResult.style.display =
        "block";

    }


    showToast(
      "Project plan created successfully."
    );


  } catch (error) {

    console.error(
      "Project Planner failed:",
      error
    );


    if (projectPlannerLoading) {

      projectPlannerLoading.style.display =
        "none";

    }


    showToast(
      error.message ||
      "ForgeMind could not create the project plan."
    );


  } finally {

    generatePlanBtn.disabled =
      false;

    generatePlanBtn.textContent =
      "⚡ Create Project Plan";

  }

}


/* -----------------------------------------
   COPY PROJECT PLAN
----------------------------------------- */

if (copyPlannerBtn) {

  copyPlannerBtn.addEventListener(
    "click",
    async () => {

      const title =
        plannerTitle?.textContent.trim();

      const overview =
        plannerOverview?.textContent.trim();

      const goals =
        Array.from(
          plannerGoals?.querySelectorAll("li") || []
        )
        .map(
          (item) => `• ${item.textContent}`
        )
        .join("\n");

      const technologies =
        Array.from(
          plannerTechnologies?.querySelectorAll(".tech") || []
        )
        .map(
          (item) => `• ${item.textContent}`
        )
        .join("\n");


      const milestones =
        Array.from(
          plannerMilestones?.children || []
        )
        .map((milestone) => {

          const heading =
            milestone.querySelector("h4")
              ?.textContent || "";

          const description =
            milestone.querySelector("p")
              ?.textContent || "";

          const tasks =
            Array.from(
              milestone.querySelectorAll("li")
            )
            .map(
              (item) => `   • ${item.textContent}`
            )
            .join("\n");


          return `
${heading}
${description}
${tasks}
`.trim();

        })
        .join("\n\n");


      const firstStep =
        plannerFirstStep?.textContent.trim();


      const planText = `
PROJECT PLAN

${title}

OVERVIEW

${overview}

PROJECT GOALS

${goals}

RECOMMENDED TECHNOLOGIES

${technologies}

DEVELOPMENT MILESTONES

${milestones}

FIRST PRACTICAL STEP

${firstStep}
`.trim();


      if (!planText) {

        showToast(
          "There is no project plan to copy yet."
        );

        return;
      }


      try {

        await navigator.clipboard.writeText(
          planText
        );


        const originalText =
          copyPlannerBtn.textContent;


        copyPlannerBtn.textContent =
          "✓ Copied";


        showToast(
          "Project plan copied to clipboard."
        );


        setTimeout(() => {

          copyPlannerBtn.textContent =
            originalText;

        }, 1600);


      } catch (error) {

        showToast(
          "Could not copy the project plan."
        );

      }

    }
  );

}