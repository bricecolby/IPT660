const main = document.querySelector("#app-main");
const navButtons = [...document.querySelectorAll("[data-view]")];

const session = {
  answers: {},
  selections: {},
  visitedViews: ["chapter"],
  viewedSections: [],
};

let course;
let activeView = "chapter";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const textIsReady = (value) => value && !String(value).includes("PLACEHOLDER");
const sectionById = (id) => course.sections.find((section) => section.sectionId === id);
const allQuestions = () => course.quizBank ?? [];
const answeredCount = () => Object.keys(session.answers).length;
const correctCount = () => Object.values(session.answers).filter((answer) => answer.correct).length;

function imageMarkup(images = [], extraClass = "") {
  if (!images.length) return "";
  return images.map((image) => {
    const src = encodeURI(image.src ?? "");
    const alt = escapeHtml(image.alt ?? "");
    const transparent = /raspberry\s*1/i.test(image.src ?? "") ? " transparent" : "";
    return `<img class="section-image${transparent} ${extraClass}" src="${src}" alt="${alt}" loading="lazy">`;
  }).join("");
}

function pageHeading(eyebrow, title, description = "") {
  return `<header class="page-heading"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1>${description ? `<p class="lead">${escapeHtml(description)}</p>` : ""}</header>`;
}

function safeEmbedUrl(video) {
  try {
    const parsed = new URL(video.embedUrl);
    return parsed.hostname === "www.youtube.com" && parsed.pathname.startsWith("/embed/") ? parsed.href : "";
  } catch {
    return "";
  }
}

function videoMarkup(video) {
  if (!video) return "";
  const embedUrl = safeEmbedUrl(video);
  const watchUrl = /^https:\/\/www\.youtube\.com\/watch\?v=/.test(video.url ?? "") ? video.url : "";
  if (!embedUrl) return "";
  return `<div class="video-wrap"><h3>${escapeHtml(video.title ?? "Chapter video")}</h3><div class="video-frame"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(video.title ?? "YouTube video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${watchUrl ? `<a class="video-link" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>` : ""}</div>`;
}

function draftNote() {
  return `<p class="draft-note">This section’s written content is still being prepared.</p>`;
}

function renderChapter() {
  const intro = sectionById("s1");
  const roles = sectionById("s2");
  const neglected = sectionById("s3");
  const alleviates = sectionById("s4");
  const summary = sectionById("s5");
  const groupthink = roles.topics?.find((topic) => topic.title === "Groupthink");
  const topics = (roles.topics ?? []).filter((topic) => topic.title !== "Groupthink");

  const introBlock = `<details class="content-section" data-section="${escapeHtml(intro.sectionId)}" open><summary>${escapeHtml(intro.heading)}</summary><div class="section-body section-with-image"><div><p>${escapeHtml(intro.body)}</p>${intro.priorKnowledgePrompt ? `<aside class="prompt"><strong>Think about it</strong><br>${escapeHtml(intro.priorKnowledgePrompt)}</aside>` : ""}</div>${imageMarkup(intro.images)}</div></details>`;

  const topicCards = topics.map((topic) => `<article class="topic-card"><h3>${escapeHtml(topic.title)}</h3>${textIsReady(topic.body) ? `<p>${escapeHtml(topic.body)}</p>` : draftNote()}</article>`).join("");
  const roleImages = imageMarkup(roles.images);
  const rolesBlock = `<details class="content-section" data-section="${escapeHtml(roles.sectionId)}"><summary>${escapeHtml(roles.heading)}</summary><div class="section-body"><p>${escapeHtml(roles.body)}</p><div class="topic-grid">${topicCards}</div>${groupthink ? `<div class="topic-card" style="margin-top:.8rem"><h3>${escapeHtml(groupthink.title)}</h3>${textIsReady(groupthink.body) ? `<p>${escapeHtml(groupthink.body)}</p>` : draftNote()}${videoMarkup(groupthink.video)}</div>` : ""}${roleImages}</div></details>`;

  const draftedBlock = (section) => `<details class="content-section" data-section="${escapeHtml(section.sectionId)}"><summary>${escapeHtml(section.heading)}</summary><div class="section-body ${section.images?.length ? "section-with-image" : ""}"><div>${draftNote()}</div>${imageMarkup(section.images)}</div></details>`;

  const summaryBlock = `<details class="content-section" data-section="${escapeHtml(summary.sectionId)}"><summary>${escapeHtml(summary.heading)}</summary><div class="section-body"><p>${escapeHtml(summary.body)}</p></div></details>`;

  main.innerHTML = `${pageHeading(course.title, "The Tester Role", "Read about the Tester, reflect on overlooked risks, and use the quiz for quick personal feedback.")}
    <section class="hero-card"><div class="hero-copy"><p class="eyebrow">Chapter 8 · Elementary school teachers</p><h2>A thoughtful question can help a group make a stronger decision.</h2><p>The Tester evaluates ideas, asks essential questions, and helps a group notice risks and practical concerns.</p><div class="callout-row"><p>Ready to check your understanding? The quiz is ungraded and gives feedback as you go.</p><button class="button" type="button" data-go="quiz">Go to the quiz</button></div></div></section>
    <div class="section-grid">${introBlock}${rolesBlock}${draftedBlock(neglected)}${draftedBlock(alleviates)}${summaryBlock}</div>`;
}

function answerStatus(question) {
  const answer = session.answers[question.questionId];
  if (!answer) return "Not answered yet";
  return answer.correct ? "Answered · correct" : "Answered · review feedback";
}

function renderQuestion(question, index) {
  const answer = session.answers[question.questionId];
  const selected = session.selections[question.questionId] ?? answer?.selected ?? "";
  const options = question.options.map((option, optionIndex) => {
    const isCorrect = answer && option === question.correctAnswer;
    const isWrongSelected = answer && option === answer.selected && !answer.correct;
    const styleClass = isCorrect ? " is-correct" : isWrongSelected ? " is-incorrect" : "";
    const checked = selected === option ? " checked" : "";
    const disabled = answer ? " disabled" : "";
    return `<label class="answer-option${styleClass}"><input type="radio" name="${escapeHtml(question.questionId)}" value="${escapeHtml(option)}"${checked}${disabled}><span>${escapeHtml(option)}</span></label>`;
  }).join("");
  const feedback = answer ? `<div class="feedback ${answer.correct ? "correct" : "incorrect"}" role="status"><strong>${answer.correct ? "That’s right." : "Here’s something to consider."}</strong>${escapeHtml(answer.correct ? question.feedback.correct : question.feedback.incorrect)}<p><span class="response-label">Answer:</span> ${escapeHtml(question.correctAnswer)}</p></div>` : "";
  return `<article class="question-card" data-question-card="${escapeHtml(question.questionId)}"><div class="question-top"><span class="question-number">${index + 1}</span><h2>${escapeHtml(question.prompt)}</h2></div><fieldset class="answer-options" aria-label="Choose an answer">${options}</fieldset><div class="question-actions">${answer ? `<button class="button secondary" type="button" data-reset-answer="${escapeHtml(question.questionId)}">Try this question again</button>` : `<button class="button" type="button" data-check-answer="${escapeHtml(question.questionId)}" ${selected ? "" : "disabled"}>Check answer</button>`}</div>${feedback}</article>`;
}

function renderQuiz() {
  const questions = allQuestions();
  const answered = answeredCount();
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const completeMessage = answered === questions.length
    ? "You’ve answered every question. Review your answers and feedback on the Dashboard."
    : "Answer any question in any order. Your responses stay in this session and are not saved for later.";
  main.innerHTML = `${pageHeading("Chapter 8 · Self-check", "Quick quiz", "Use these questions to think through the Tester role. This is for your own learning, not a grade.")}
    <p class="quiz-intro">Choose an answer and select <strong>Check answer</strong> to see immediate feedback.</p>
    <div class="quiz-progress" aria-label="Quiz progress"><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><strong>${answered} of ${questions.length} answered</strong></div>
    <div class="question-list">${questions.map(renderQuestion).join("")}</div>
    <div class="quiz-end"><p>${completeMessage}</p><button class="button" type="button" data-go="dashboard">View my Dashboard</button></div>`;
}

function renderDashboard() {
  const questions = allQuestions();
  const answered = answeredCount();
  const feedbackList = questions.map((question, index) => {
    const answer = session.answers[question.questionId];
    if (!answer) return `<li class="response-item"><h3>${index + 1}. ${escapeHtml(question.prompt)}</h3><p class="response-label">Not answered yet</p></li>`;
    return `<li class="response-item ${answer.correct ? "correct" : "incorrect"}"><h3>${index + 1}. ${escapeHtml(question.prompt)}</h3><p><span class="response-label">Your answer:</span> ${escapeHtml(answer.selected)}</p><p><span class="response-label">Correct answer:</span> ${escapeHtml(question.correctAnswer)}</p><p><span class="response-label">Feedback:</span> ${escapeHtml(answer.correct ? question.feedback.correct : question.feedback.incorrect)}</p></li>`;
  }).join("");
  const progressText = answered === questions.length ? "Quiz complete for this session" : `${answered} of ${questions.length} questions answered`;
  const empty = answered === 0 ? `<p class="empty-state">Your session dashboard will fill in as you answer quiz questions. Nothing is saved after this session ends.</p>` : "";
  main.innerHTML = `${pageHeading("Your session · R5", "Dashboard", "Review your quiz answers and feedback, then return to the chapter whenever you want.")}
    <div class="dashboard-grid"><div class="metric"><span>Quiz score so far</span><strong>${correctCount()} / ${answered}</strong></div><div class="metric"><span>Quiz progress</span><strong>${answered} / ${questions.length}</strong></div><div class="metric"><span>Views visited</span><strong>${session.visitedViews.length} / 3</strong></div></div>
    <section class="dashboard-card"><h2>${escapeHtml(progressText)}</h2><p>This score is a private self-check to help you process what you read. It is not a grade and is only held in this browser session.</p>${empty}<ol class="response-list">${feedbackList}</ol><div class="dashboard-actions"><button class="button secondary" type="button" data-go="chapter">Return to Chapter 8</button><button class="button" type="button" data-go="quiz">${answered ? "Review the quiz" : "Start the quiz"}</button></div></section>
    <aside class="notice-card">Session data clears when you refresh or close the page. There is no account, backend, or saved record.</aside>`;
}

function showView(view, moveFocus = false) {
  if (!["chapter", "quiz", "dashboard"].includes(view)) return;
  activeView = view;
  if (!session.visitedViews.includes(view)) session.visitedViews.push(view);
  navButtons.forEach((button) => {
    if (button.dataset.view === view) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "chapter") renderChapter();
  if (view === "quiz") renderQuiz();
  if (view === "dashboard") renderDashboard();
  if (moveFocus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view, true)));

main.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    showView(goButton.dataset.go, true);
    return;
  }
  const checkButton = event.target.closest("[data-check-answer]");
  if (checkButton) {
    const question = allQuestions().find((item) => item.questionId === checkButton.dataset.checkAnswer);
    const selected = session.selections[question.questionId];
    if (!selected) return;
    session.answers[question.questionId] = { selected, correct: selected === question.correctAnswer };
    renderQuiz();
    return;
  }
  const resetButton = event.target.closest("[data-reset-answer]");
  if (resetButton) {
    const id = resetButton.dataset.resetAnswer;
    delete session.answers[id];
    delete session.selections[id];
    renderQuiz();
  }
});

main.addEventListener("change", (event) => {
  const input = event.target.closest('input[type="radio"]');
  if (!input) return;
  session.selections[input.name] = input.value;
  const checkButton = main.querySelector(`[data-check-answer="${CSS.escape(input.name)}"]`);
  if (checkButton) checkButton.disabled = false;
});

main.addEventListener("toggle", (event) => {
  const section = event.target.closest("details[data-section]");
  if (section?.open && !session.viewedSections.includes(section.dataset.section)) {
    session.viewedSections.push(section.dataset.section);
  }
}, true);

fetch("./GroupFruit.course.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Could not load course content (${response.status}).`);
    return response.json();
  })
  .then((data) => {
    course = data;
    showView("chapter");
  })
  .catch(() => {
    main.innerHTML = `<section class="error-state"><strong>Course content didn’t load.</strong><p>Open this folder in VS Code and start a simple local preview (such as Live Server) from <code>index.html</code>. The page reads the adjacent JSON file, so it needs a local preview address to load it.</p></section>`;
  });
