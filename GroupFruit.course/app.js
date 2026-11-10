const main = document.querySelector("#app-main");
const navLinks = [...document.querySelectorAll("[data-nav-view]")];

const session = {
  answers: {},
  selections: {},
  visitedViews: ["chapter"],
  viewedSections: new Set(),
  interactions: 0,
  startedAt: Date.now(),
};

let course;
let activeView = "chapter";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const sectionById = (id) => course.sections.find((section) => section.sectionId === id);
const allQuestions = () => course.quizBank ?? [];
const answeredCount = () => Object.keys(session.answers).length;
const correctCount = () => Object.values(session.answers).filter((answer) => answer.correct).length;
const slug = (value = "") => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function imageMarkup(image, className = "section-image") {
  if (!image?.src) return "";
  const src = encodeURI(image.src);
  const transparent = /raspberry\s*1/i.test(image.src) ? " transparent" : "";
  return `<img class="${escapeHtml(className)}${transparent}" src="${src}" alt="${escapeHtml(image.alt ?? "")}" loading="lazy">`;
}

function imageGallery(images = [], label = "Supporting illustrations") {
  if (!images.length) return "";
  return `<div class="chapter-wireframe__images" aria-label="${escapeHtml(label)}">${images.map((image) => imageMarkup(image)).join("")}</div>`;
}

function pageHeading(eyebrow, title, description = "") {
  return `<header class="page-heading"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1>${description ? `<p class="lead">${escapeHtml(description)}</p>` : ""}</header>`;
}

function safeEmbedUrl(video) {
  try {
    const parsed = new URL(video.embedUrl);
    return parsed.protocol === "https:" && parsed.hostname === "www.youtube.com" && /^\/embed\/[\w-]+$/.test(parsed.pathname) ? parsed.href : "";
  } catch {
    return "";
  }
}

function videoMarkup(video) {
  const embedUrl = safeEmbedUrl(video ?? {});
  const watchUrl = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+$/.test(video?.url ?? "") ? video.url : "";
  if (!embedUrl) return "";
  return `<div class="video-wrap"><h3>${escapeHtml(video.title ?? "Chapter video")}</h3>${video.description ? `<p>${escapeHtml(video.description)}</p>` : ""}<div class="video-frame"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(video.title ?? "YouTube video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${watchUrl ? `<a class="video-link" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>` : ""}</div>`;
}

function draftNote() {
  return `<p class="draft-note">This section’s written content is still being prepared.</p>`;
}

function topicMarkup(topic) {
  const topicId = `topic-${slug(topic.title)}`;
  const body = topic.body && !topic.body.includes("PLACEHOLDER") ? `<p>${escapeHtml(topic.body)}</p>` : draftNote();
  return `<article id="${topicId}" class="topic-card" data-topic-title="${escapeHtml(topic.title)}"><h3>${escapeHtml(topic.title)}</h3>${body}${videoMarkup(topic.video)}</article>`;
}

function chapterSectionMarkup(section) {
  const topics = (section.topics ?? []).map(topicMarkup).join("");
  const body = section.body && !section.body.includes("PLACEHOLDER") ? `<p>${escapeHtml(section.body)}</p>` : draftNote();
  const prompt = section.priorKnowledgePrompt ? `<aside class="prompt"><strong>Think about it</strong><br>${escapeHtml(section.priorKnowledgePrompt)}</aside>` : "";
  const images = imageGallery(section.images, `${section.heading} illustrations`);
  const sectionContent = section.topics?.length
    ? `${body}<div class="topic-grid">${topics}</div>${images}`
    : `<div class="section-body-copy">${body}${prompt}</div>${images}`;
  const imageLayout = section.images?.length && !section.topics?.length ? "section-with-image" : "";
  return `<details id="${escapeHtml(section.sectionId)}" class="content-section" data-section="${escapeHtml(section.sectionId)}" ${section.sectionId === "s1" ? "open" : ""}><summary>${escapeHtml(section.heading)}</summary><div class="section-body ${imageLayout}">${sectionContent}</div></details>`;
}

function renderChapter() {
  const chapterView = course.views?.find((view) => view.viewId === "chapter");
  const sections = (chapterView?.contentSectionIds ?? ["s1", "s2", "s3", "s4", "s5"])
    .map(sectionById).filter(Boolean);
  const primaryImage = chapterView?.images?.find((image) => image.placement === "prominent chapter image") ?? chapterView?.images?.[0];
  const supportingImages = (chapterView?.images ?? []).filter((image) => image !== primaryImage && image.placement !== "Role Functions supporting image");
  const displaySections = sections.map((section) => section.sectionId === "s1" && primaryImage
    ? { ...section, images: (section.images ?? []).filter((image) => image.src !== primaryImage.src) }
    : section);
  if (sections.some((section) => section.sectionId === "s1")) session.viewedSections.add("s1");

  main.innerHTML = `${pageHeading("Chapter 8 · R1 Deliver content", chapterView?.title ?? "The Tester Role", "Read about the Tester, reflect on overlooked risks, and use the ungraded quiz for personal feedback.")}
    <section class="hero-card"><div class="hero-copy"><p class="eyebrow">${escapeHtml(course.audience ?? "")}</p><h2>A thoughtful question can help a group make a stronger decision.</h2><p>The Tester evaluates ideas, asks essential questions, and helps a group notice risks and practical concerns.</p>${primaryImage ? `<div class="chapter-primary-image">${imageMarkup(primaryImage, "section-image")}</div>` : ""}<div class="callout-row"><p>Ready to check your understanding? The quiz is ungraded and gives feedback as you go.</p><button class="button" type="button" data-go="quiz">Go to the quiz</button></div></div></section>
    <div class="section-grid">${displaySections.map(chapterSectionMarkup).join("")}</div>
    ${imageGallery(supportingImages, "Additional Chapter 8 illustrations")}
    <div class="wireframe-view__actions"><button class="button" type="button" data-go="quiz">Go to the quiz</button></div>`;
}

function chapterReferenceLinks(question) {
  return (question.chapterReferences ?? []).map((reference) => {
    const topic = reference.topicTitle ? `topic-${slug(reference.topicTitle)}` : "";
    return `<a class="video-link chapter-review-link" href="#${escapeHtml(reference.sectionId)}" data-review-section="${escapeHtml(reference.sectionId)}"${topic ? ` data-review-topic="${topic}"` : ""}>${escapeHtml(reference.label ?? `Review ${reference.topicTitle ?? "Chapter 8"}`)}</a>`;
  }).join(" ");
}

function feedbackMarkup(question, answer) {
  const correct = answer.correct;
  return `<div class="feedback ${correct ? "correct" : "incorrect"}" role="status"><strong>${correct ? "That’s right." : "Here’s something to consider."}</strong><p>${escapeHtml(correct ? question.feedback.correct : question.feedback.incorrect)}</p><p><span class="response-label">Answer:</span> ${escapeHtml(question.correctAnswer)}</p>${!correct ? `<div class="feedback-review"><strong>Review the related chapter information:</strong><div>${chapterReferenceLinks(question)}</div></div>` : ""}</div>`;
}

function renderQuestion(question, index) {
  const answer = session.answers[question.questionId];
  const selected = session.selections[question.questionId] ?? answer?.selected ?? "";
  const options = question.options.map((option) => {
    const isCorrect = answer && option === question.correctAnswer;
    const isWrongSelected = answer && option === answer.selected && !answer.correct;
    const stateClass = isCorrect ? " is-correct" : isWrongSelected ? " is-incorrect" : "";
    const checked = selected === option ? " checked" : "";
    const disabled = answer ? " disabled" : "";
    return `<label class="answer-option${stateClass}"><input type="radio" name="${escapeHtml(question.questionId)}" value="${escapeHtml(option)}"${checked}${disabled}><span>${escapeHtml(option)}</span></label>`;
  }).join("");
  const feedback = answer ? feedbackMarkup(question, answer) : "";
  const action = answer
    ? `<button class="button secondary" type="button" data-reset-answer="${escapeHtml(question.questionId)}">Try this question again</button>`
    : `<button class="button" type="button" data-check-answer="${escapeHtml(question.questionId)}" ${selected ? "" : "disabled"}>Check answer</button>`;
  return `<li class="question-card" id="${escapeHtml(question.questionId)}" data-question-card="${escapeHtml(question.questionId)}"><div class="question-top"><span class="question-number">${index + 1}</span><h2>${escapeHtml(question.prompt)}</h2></div><fieldset class="answer-options" aria-label="Choose an answer">${options}</fieldset><div class="question-actions">${action}</div>${feedback}</li>`;
}

function renderQuiz(options = {}) {
  const questions = allQuestions();
  const answered = answeredCount();
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const quizView = course.views?.find((view) => view.viewId === "quiz");
  const quizImage = quizView?.images?.find((image) => image.src === "tester page image 2.png");
  const introImages = quizView?.images?.filter((image) => image !== quizImage) ?? [];
  const practice = sectionById("s6")?.scenarioPractice;
  const progressCopy = answered === questions.length
    ? "You’ve answered every question. Review your answers and feedback on the Dashboard."
    : "Your answers are a private self-check and stay in this browser session only.";

  main.innerHTML = `${pageHeading("Quiz View · R3 Quiz or assessment with feedback", quizView?.title ?? "Brief Quiz", quizView?.introduction ?? "An ungraded self-check with feedback to help you find related Chapter 8 material.")}
    <p class="quiz-intro">Choose an answer and select <strong>Check answer</strong> to see feedback. For missed answers, use the chapter review links to return to the related material.</p>
    <div class="quiz-wireframe__intro">${quizImage ? imageMarkup(quizImage) : ""}<div><h2>Quick self-check</h2><p>This quiz is for your own information. It is not graded, and your answers are not saved for another session.</p>${imageGallery(introImages, "Quiz illustrations")}</div></div>
    <div class="quiz-progress" aria-label="Quiz progress"><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><strong>${answered} of ${questions.length} answered</strong></div>
    <p class="quiz-progress-copy" aria-live="polite">${progressCopy}</p>
    <ol class="question-list">${questions.map(renderQuestion).join("")}</ol>
    ${practice ? `<section class="dashboard-card practice-card"><h2>${escapeHtml(practice.title)}</h2><p>${escapeHtml(practice.instructions)}</p><ul>${practice.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("")}</ul></section>` : ""}
    <div class="wireframe-view__actions"><button class="button" type="button" data-go="dashboard">${answered === questions.length ? "See my results on the Dashboard" : "View session Dashboard"}</button></div>`;
  if (options.focusQuestionId) {
    const focusTarget = main.querySelector(`#${CSS.escape(options.focusQuestionId)} .feedback`);
    focusTarget?.setAttribute("tabindex", "-1");
    focusTarget?.focus({ preventScroll: true });
  }
}

function durationText() {
  const seconds = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}

function dashboardRecommendationMarkup(question) {
  const references = question.chapterReferences ?? [];
  if (!references.length) return `<p class="needed-instruction">No chapter review link is attached to this question yet.</p>`;
  return `<div class="needed-instruction"><strong>Needed instruction:</strong> revisit the related Chapter 8 material. <div>${chapterReferenceLinks(question)}</div></div>`;
}

function renderDashboard() {
  const questions = allQuestions();
  const answered = answeredCount();
  const dashboardView = course.views?.find((view) => view.viewId === "dashboard");
  const feedbackList = questions.map((question, index) => {
    const answer = session.answers[question.questionId];
    if (!answer) return `<li class="response-item"><h3>${index + 1}. ${escapeHtml(question.prompt)}</h3><p class="response-label">Not answered yet</p></li>`;
    const recommendation = answer.correct ? "" : dashboardRecommendationMarkup(question);
    return `<li class="response-item ${answer.correct ? "correct" : "incorrect"}"><h3>${index + 1}. ${escapeHtml(question.prompt)}</h3><p><span class="response-label">Your answer:</span> ${escapeHtml(answer.selected)}</p><p><span class="response-label">Correct answer:</span> ${escapeHtml(question.correctAnswer)}</p><p><span class="response-label">Feedback:</span> ${escapeHtml(answer.correct ? question.feedback.correct : question.feedback.incorrect)}</p>${recommendation}</li>`;
  }).join("");
  const progressText = answered === questions.length ? "Quiz complete for this session" : `${answered} of ${questions.length} questions answered`;
  const empty = answered === 0 ? `<p class="empty-state">Your session dashboard will fill in as you answer quiz questions. Nothing is saved after this session ends.</p>` : "";
  const dashboardImages = imageGallery(dashboardView?.images ?? [], "Dashboard illustrations");

  main.innerHTML = `${pageHeading("Dashboard · R5 Dashboard of session data", dashboardView?.title ?? "Quiz Results & Needed Instruction", "Review your quiz results and feedback, then return to the linked Chapter 8 sections whenever you want.")}
    <div class="dashboard-wireframe__results"><article class="metric"><span>Quiz score so far</span><strong>${correctCount()} / ${answered}</strong></article><article class="metric"><span>Questions answered</span><strong>${answered} / ${questions.length}</strong></article><article class="metric"><span>Chapter sections opened</span><strong>${session.viewedSections.size}</strong></article><article class="metric"><span>Views visited</span><strong>${session.visitedViews.length} / 3</strong></article><article class="metric"><span>Interactions this session</span><strong>${session.interactions}</strong></article><article class="metric"><span>Session time</span><strong>${durationText()}</strong></article></div>
    <section class="dashboard-card"><h2>${escapeHtml(progressText)}</h2><p>This score is for your own learning, not a grade. It is held only for this browser session.</p>${empty}<ol class="response-list">${feedbackList}</ol><div class="dashboard-actions"><button class="button secondary" type="button" data-go="chapter">Return to Chapter 8</button><button class="button" type="button" data-go="quiz">${answered ? "Review the quiz" : "Start the quiz"}</button></div></section>
    ${dashboardImages}<aside class="notice-card">Session data clears when this page is refreshed or closed. There is no account, backend, or saved record.</aside>`;
}

function updateNavigation() {
  navLinks.forEach((link) => {
    if (link.dataset.navView === activeView) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function showView(view, { moveFocus = false, updateHash = true } = {}) {
  if (!["chapter", "quiz", "dashboard"].includes(view)) view = "chapter";
  activeView = view;
  if (!session.visitedViews.includes(view)) session.visitedViews.push(view);
  updateNavigation();
  if (view === "chapter") renderChapter();
  if (view === "quiz") renderQuiz();
  if (view === "dashboard") renderDashboard();
  if (updateHash && window.location.hash !== `#${view}-view`) history.replaceState(null, "", `#${view}-view`);
  if (moveFocus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openChapterReference(sectionId, topicId = "") {
  session.interactions += 1;
  showView("chapter", { moveFocus: false });
  const section = main.querySelector(`#${CSS.escape(sectionId)}`);
  if (section) {
    section.open = true;
    session.viewedSections.add(sectionId);
  }
  const target = topicId ? main.querySelector(`#${CSS.escape(topicId)}`) : section;
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (window.location.hash !== `#${sectionId}`) history.replaceState(null, "", `#${sectionId}`);
  target?.setAttribute("tabindex", "-1");
  target?.focus({ preventScroll: true });
}

navLinks.forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  session.interactions += 1;
  showView(link.dataset.navView, { moveFocus: true });
}));

main.addEventListener("click", (event) => {
  const reviewLink = event.target.closest("[data-review-section]");
  if (reviewLink) {
    event.preventDefault();
    openChapterReference(reviewLink.dataset.reviewSection, reviewLink.dataset.reviewTopic ?? "");
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    session.interactions += 1;
    showView(goButton.dataset.go, { moveFocus: true });
    return;
  }

  const checkButton = event.target.closest("[data-check-answer]");
  if (checkButton) {
    const question = allQuestions().find((item) => item.questionId === checkButton.dataset.checkAnswer);
    const selected = session.selections[question?.questionId];
    if (!question || !selected) return;
    session.answers[question.questionId] = { selected, correct: selected === question.correctAnswer };
    session.interactions += 1;
    renderQuiz({ focusQuestionId: question.questionId });
    return;
  }

  const resetButton = event.target.closest("[data-reset-answer]");
  if (resetButton) {
    const id = resetButton.dataset.resetAnswer;
    delete session.answers[id];
    delete session.selections[id];
    session.interactions += 1;
    renderQuiz();
  }
});

main.addEventListener("change", (event) => {
  const input = event.target.closest('input[type="radio"]');
  if (!input) return;
  session.selections[input.name] = input.value;
  session.interactions += 1;
  const checkButton = main.querySelector(`[data-check-answer="${CSS.escape(input.name)}"]`);
  if (checkButton) checkButton.disabled = false;
});

main.addEventListener("toggle", (event) => {
  const section = event.target.closest("details[data-section]");
  if (section?.open) {
    session.viewedSections.add(section.dataset.section);
    session.interactions += 1;
  }
}, true);

window.addEventListener("hashchange", () => {
  const view = window.location.hash.replace(/^#/, "").replace(/-view$/, "");
  if (["chapter", "quiz", "dashboard"].includes(view) && view !== activeView) {
    showView(view, { updateHash: false });
  }
});

fetch("./GroupFruit.course.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Could not load course content (${response.status}).`);
    return response.json();
  })
  .then((data) => {
    course = data;
    const initialView = window.location.hash.replace(/^#/, "").replace(/-view$/, "");
    showView(["chapter", "quiz", "dashboard"].includes(initialView) ? initialView : "chapter", { updateHash: false });
  })
  .catch((error) => {
    main.innerHTML = `<section class="error-state"><strong>Course content didn’t load.</strong><p>Open this folder in VS Code and start a local preview (such as Live Server) from <code>index.html</code>. The page reads the adjacent JSON file, so it needs a local preview address to load it.</p><p class="error-detail">${escapeHtml(error.message)}</p></section>`;
  });
