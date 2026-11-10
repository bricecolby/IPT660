(function () {
  'use strict';

  const data = window.LMS_DATA;
  if (!data || !data.module || !data.mockInterview || !data.reflection || !data.rubric) {
    document.getElementById('content').innerHTML = '<div class="empty-state">The course content could not be loaded. Rebuild this preview from the project JSON files.</div>';
    return;
  }

  const course = data.module.module;
  const scenarios = data.mockInterview.activity.scenarios;
  const reflection = data.reflection.activity;
  const rubric = data.rubric.feedback_rubric;
  const content = document.getElementById('content');
  const nav = document.getElementById('course-nav');
  const crumb = document.getElementById('current-crumb');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const state = {
    scenarioIndex: 0,
    answers: Object.create(null),
    ratings: Object.create(null),
    rubricOpen: Object.create(null),
    reflections: Object.create(null),
    reflectionComplete: false
  };

  const icons = ['⌂', '▦', '↗', '≋', '◎', '✧', '▤', '↻'];
  const escapeHtml = (value) => String(value == null ? '' : value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const lessonPages = course.pages.filter((page) => !['home', 'mock-interview', 'reflection'].includes(page.id));
  const activityIds = ['mock-interview', 'reflection'];
  const metrics = {
    pageVisits: Object.create(null),
    lessonsViewed: new Set(),
    completedLessons: new Set(),
    completedActivities: new Set(),
    attemptedQuestions: new Set(),
    responseRevisions: 0,
    feedbackViews: 0,
    resourcesViewed: 0,
    timeSpentMs: Object.create(null)
  };
  state.metrics = metrics;
  state.answerBaselines = Object.create(null);
  state.selectedTopic = course.work_authorization_topics?.[0]?.id || '';
  state.resourcesOpen = false;
  let trackedPage = null;
  let pageEnteredAt = 0;

  function pageId() {
    const hash = window.location.hash.replace(/^#/, '');
    return course.site_navigation.some((item) => item.page_id === hash) ? hash : 'home';
  }

  function pageTitle(id) {
    const item = course.site_navigation.find((entry) => entry.page_id === id);
    return item ? item.label : 'Home';
  }

  function completedCount() {
    return metrics.completedLessons.size + metrics.completedActivities.size + (metrics.resourcesViewed > 0 ? 1 : 0);
  }

  function completionPercent() {
    const total = lessonPages.length + activityIds.length + 1;
    return total ? Math.round((completedCount() / total) * 100) : 0;
  }

  function trackPageEntry(id) {
    metrics.pageVisits[id] = (metrics.pageVisits[id] || 0) + 1;
    if (lessonPages.some((page) => page.id === id)) metrics.lessonsViewed.add(id);
    trackedPage = id;
    pageEnteredAt = performance.now();
  }

  function flushPageTime() {
    if (!trackedPage) return;
    const elapsed = Math.max(0, performance.now() - pageEnteredAt);
    metrics.timeSpentMs[trackedPage] = (metrics.timeSpentMs[trackedPage] || 0) + elapsed;
    pageEnteredAt = performance.now();
  }

  function secondsOnPage(id) {
    const running = trackedPage === id ? Math.max(0, performance.now() - pageEnteredAt) : 0;
    return Math.round(((metrics.timeSpentMs[id] || 0) + running) / 1000);
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }

  function updateMiniProgress() {
    const percent = completionPercent();
    const label = document.getElementById('session-percent');
    const bar = document.getElementById('session-mini-fill');
    if (label) label.textContent = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;
  }

  function drawNavigation() {
    const current = pageId();
    nav.innerHTML = course.site_navigation.map((item, index) => `
      <a class="nav-link" href="#${escapeHtml(item.page_id)}" ${item.page_id === current ? 'aria-current="page"' : ''}>
        <span class="nav-icon" aria-hidden="true">${icons[index] || '•'}</span>
        <span>${escapeHtml(item.label)}</span>
      </a>`).join('');
    updateMiniProgress();
  }

  function renderHome() {
    const objectives = course.learning_objectives.map((item, index) => `
      <article class="objective-card"><span class="objective-number">${String(index + 1).padStart(2, '0')}</span>
        <p>${escapeHtml(item.objective)}</p></article>`).join('');
    return `
      <section class="hero">
        <div class="hero-content">
          <p class="eyebrow">${escapeHtml(course.title)}</p>
          <h1>Show up ready for your next interview.</h1>
          <p class="lede">${escapeHtml(course.summary)}</p>
          <div class="hero-meta"><span class="pill">Self-paced learning</span><span class="pill">5 practice questions</span><span class="pill">No recording required</span></div>
          <a class="primary-btn" href="#interview-preparation">Start learning <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <div class="section-heading"><h2>What you’ll learn</h2><p>Use these skills in your next interview.</p></div>
      <section class="objective-grid" aria-label="Learning objectives">${objectives}</section>
      <section class="home-bottom">
        <article class="info-card"><h3>A practical path from prep to practice</h3>
          <ul><li>Review interview expectations and professional communication.</li><li>Practice answers to common and behavioral questions.</li><li>Use a checklist to assess your own responses.</li><li>Reflect on what to practice before your next interview.</li></ul>
        </article>
        <article class="info-card"><h3>A note about work authorization</h3>
          <p>This module offers practice in communicating professionally. It does not provide immigration or legal advice.</p>
          <div class="notice">For guidance about your individual situation, contact your campus international student office or a qualified professional.</div>
        </article>
      </section>`;
  }

  function renderBlock(block) {
    const title = escapeHtml(block.heading || '');
    const type = escapeHtml(String(block.type || 'lesson').replaceAll('_', ' '));
    if (block.type === 'best_practices') {
      return `<article class="lesson-card"><span class="lesson-type">${type}</span><h3>${title}</h3><ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`;
    }
    if (block.type === 'example') {
      return `<article class="lesson-card"><span class="lesson-type">${type}</span><h3>${title}</h3><ul class="example-list">${(block.items || []).map((item) => {
        const split = String(item).split(':');
        return split.length > 1 ? `<li><strong>${escapeHtml(split.shift())}:</strong><span>${escapeHtml(split.join(':').trim())}</span></li>` : `<li>${escapeHtml(item)}</li>`;
      }).join('')}</ul></article>`;
    }
    return `<article class="lesson-card"><span class="lesson-type">${type}</span><h3>${title}</h3><p>${escapeHtml(block.body || '')}</p></article>`;
  }

  function renderLesson(id) {
    const page = course.pages.find((item) => item.id === id);
    if (!page) return '<div class="empty-state">This lesson is not available.</div>';
    const isComplete = metrics.completedLessons.has(id);
    return `<section class="lesson-intro"><p class="eyebrow">Interview Ready • Lesson</p><h1>${escapeHtml(page.title)}</h1><p class="lede">${escapeHtml(page.purpose)}</p></section>
      <section class="lesson-grid">${(page.content_blocks || []).map(renderBlock).join('')}</section>
      <div class="section-heading lesson-actions"><button class="secondary-btn" type="button" data-action="complete-lesson" data-page="${escapeHtml(id)}" ${isComplete ? 'disabled' : ''}>${isComplete ? 'Lesson completed ✓' : 'Mark lesson complete'}</button><a class="primary-btn" href="#${escapeHtml(nextPage(id))}">Continue <span aria-hidden="true">→</span></a></div>`;
  }

  function renderWorkAuthorization() {
    const topics = course.work_authorization_topics || [];
    const selected = topics.find((topic) => topic.id === state.selectedTopic) || topics[0];
    if (!selected) return renderLesson('work-authorization');
    const topicButtons = topics.map((topic) => `<button class="topic-button ${topic.id === selected.id ? 'is-selected' : ''}" type="button" data-topic="${escapeHtml(topic.id)}" aria-pressed="${topic.id === selected.id}">${escapeHtml(topic.title)}</button>`).join('');
    const advice = selected.guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<section class="lesson-intro"><p class="eyebrow">Interview Ready • Focus lesson</p><h1>Work authorization & sponsorship</h1>
      <p class="lede">Practice clear, accurate ways to discuss work authorization and your value to an employer. You do not need to select or disclose a specific visa category here.</p></section>
      <section class="topic-picker"><p class="question-label">Choose a conversation topic</p><div class="topic-buttons" role="group" aria-label="Sponsorship conversation topics">${topicButtons}</div></section>
      <section class="topic-detail"><p class="eyebrow">Practice topic</p><h2>${escapeHtml(selected.title)}</h2>
        <div class="sponsorship-question"><span class="question-label">An employer might ask</span><p>${escapeHtml(selected.employer_question)}</p></div>
        <div class="topic-columns"><article class="info-card"><h3>How to prepare</h3><ul>${advice}</ul></article>
          <article class="sample-card"><span class="lesson-type">Practice response template</span><p>“${escapeHtml(selected.sample_response)}”</p><span class="field-hint">Adapt this only after confirming that the details are accurate for you.</span></article></div>
        <div class="notice sponsorship-note">${escapeHtml(selected.resource_note)} You may also use campus career services to practice the wording of your answer.</div>
      </section>
      <section class="info-card sponsorship-context"><h3>How sponsorship may relate to a hiring decision</h3><p>Employers make decisions based on role needs, candidate qualifications, internal policies, and applicable processes. You can make your case by connecting your skills and experience to the job. Sponsorship processes, costs, timelines, and requirements vary, so avoid promising outcomes or giving legal explanations.</p></section>
      <section class="resource-section"><button class="secondary-btn" type="button" data-action="toggle-resources">${state.resourcesOpen ? 'Hide guidance resources' : 'Where can I get reliable guidance?'} <span aria-hidden="true">${state.resourcesOpen ? '−' : '+'}</span></button>
        ${state.resourcesOpen ? `<div class="resource-grid"><article class="resource-card"><span class="resource-index">01</span><h3>Campus international student office</h3><p>Ask about your individual status, authorization, and timing. Use the office's official contact or appointment process.</p></article><article class="resource-card"><span class="resource-index">02</span><h3>Campus career services</h3><p>Practice explaining your qualifications, researching an employer, and preparing concise answers.</p></article><article class="resource-card"><span class="resource-index">03</span><h3>Employer recruiting or HR contact</h3><p>Ask about the employer's own process and role requirements. Processes differ by employer and position.</p></article></div>` : ''}
      </section>
      <div class="notice privacy-caution">For your privacy, do not type passport numbers, visa numbers, or other sensitive identifiers into these practice activities. Your selections and responses are held only in this page session.</div>
      <div class="section-heading lesson-actions"><button class="secondary-btn" type="button" data-action="complete-lesson" data-page="work-authorization" ${metrics.completedLessons.has('work-authorization') ? 'disabled' : ''}>${metrics.completedLessons.has('work-authorization') ? 'Lesson completed ✓' : 'Mark lesson complete'}</button><a class="primary-btn" href="#professional-communication">Continue <span aria-hidden="true">→</span></a></div>`;
  }

  function renderDashboard() {
    const total = lessonPages.length + activityIds.length + 1;
    const percent = completionPercent();
    const pageViewCount = Object.values(metrics.pageVisits).reduce((sum, count) => sum + count, 0);
    const attempted = metrics.attemptedQuestions.size;
    const completedActivities = metrics.completedActivities.size;
    const checklist = rubric.checklist_items;
    const needsPractice = new Map();
    Object.values(state.ratings).forEach((ratings) => {
      checklist.forEach((item) => {
        if (ratings[item.id] && Number(ratings[item.id]) <= 2) needsPractice.set(item.id, item.label);
      });
    });
    const progressItems = [
      ...lessonPages.map((page) => ({ id: page.id, title: page.title, type: 'Lesson', complete: metrics.completedLessons.has(page.id), started: metrics.lessonsViewed.has(page.id) })),
      { id: 'mock-interview', title: 'Mock Interview', type: 'Activity', complete: metrics.completedActivities.has('mock-interview'), started: Boolean(metrics.pageVisits['mock-interview']) },
      { id: 'reflection', title: 'Reflection', type: 'Activity', complete: metrics.completedActivities.has('reflection'), started: Boolean(metrics.pageVisits.reflection) },
      { id: 'work-authorization', title: 'Trusted support resources', type: 'Resource', complete: metrics.resourcesViewed > 0, started: Boolean(metrics.pageVisits['work-authorization']) }
    ];
    const rows = progressItems.map((item) => {
      const row = `<a class="progress-row" href="#${escapeHtml(item.id)}"><span><small>${escapeHtml(item.type)}</small><strong>${escapeHtml(item.title)}</strong></span><span class="progress-state ${item.complete ? 'complete' : ''}">${item.complete ? 'Complete ✓' : item.started ? 'In progress' : 'Not started'} <b>→</b></span></a>`;
      if (item.id !== 'mock-interview') return row;
      const questionRows = scenarios.map((scenario, index) => `<button class="question-progress-row" type="button" data-action="open-question" data-index="${index}"><span>Q${index + 1} · ${escapeHtml(scenario.title)}</span><strong class="${metrics.attemptedQuestions.has(scenario.id) ? 'is-done' : ''}">${metrics.attemptedQuestions.has(scenario.id) ? 'Tried ✓' : 'Not tried'}</strong></button>`).join('');
      return `${row}<div class="question-progress-list">${questionRows}</div>`;
    }).join('');
    const weakAreas = needsPractice.size ? `<ul class="needs-practice-list">${Array.from(needsPractice.values()).map((label) => `<li>${escapeHtml(label)}</li>`).join('')}</ul><a class="text-btn" href="#mock-interview">Return to practice →</a>` : '<p>Complete a self-assessment checklist to see which areas you may want to practice more.</p>';
    const timePages = ['interview-preparation', 'interview-question-basics', 'work-authorization', 'professional-communication', 'mock-interview', 'reflection'];
    const timeLabels = new Map(lessonPages.concat([{ id: 'mock-interview', title: 'Mock Interview' }, { id: 'reflection', title: 'Reflection' }]).map((item) => [item.id, item.title]));
    const timeRows = timePages.map((id) => `<div class="time-row"><span>${escapeHtml(timeLabels.get(id) || id)}</span><strong>${formatDuration(secondsOnPage(id))}</strong></div>`).join('');
    return `<section class="lesson-intro dashboard-heading"><p class="eyebrow">Private session overview</p><h1>Your progress this session</h1><p class="lede">This dashboard summarizes activity in the current browser session only. Refreshing or closing the page clears progress, metrics, and typed responses.</p></section>
      <section class="dashboard-progress"><div class="dashboard-progress-copy"><div><span class="eyebrow">Course completion</span><strong>${percent}%</strong></div><p>${completedCount()} of ${total} lessons, activities, and resource steps complete</p></div><div class="progress-track"><span style="width:${percent}%"></span></div></section>
      <section class="metric-grid" aria-label="Session summary">
        <article class="metric-card"><span class="metric-icon blue">▤</span><small>Questions practiced</small><strong>${attempted} <em>of ${scenarios.length}</em></strong></article>
        <article class="metric-card"><span class="metric-icon green">✓</span><small>Activities completed</small><strong>${completedActivities} <em>of 2</em></strong></article>
        <article class="metric-card"><span class="metric-icon gold">◷</span><small>Page visits</small><strong>${pageViewCount}</strong></article>
        <article class="metric-card"><span class="metric-icon purple">↻</span><small>Answer revisions</small><strong>${metrics.responseRevisions}</strong></article>
      </section>
      <section class="dashboard-columns"><article class="dashboard-panel"><div class="panel-heading"><div><p class="eyebrow">Learning path</p><h2>Completed and remaining</h2></div><span class="panel-count">${completedCount()} / ${total}</span></div><div class="progress-list">${rows}</div></article>
        <div class="dashboard-side"><article class="dashboard-panel"><div class="panel-heading"><div><p class="eyebrow">Practice insights</p><h2>Areas to revisit</h2></div></div>${weakAreas}</article>
          <article class="dashboard-panel"><div class="panel-heading"><div><p class="eyebrow">Session details</p><h2>Activity metrics</h2></div></div>
            <div class="session-metric-line"><span>Unique lessons viewed</span><strong>${metrics.lessonsViewed.size}</strong></div>
            <div class="session-metric-line"><span>Self-assessment feedback views</span><strong>${metrics.feedbackViews}</strong></div>
            <div class="session-metric-line"><span>Resource guidance opened</span><strong>${metrics.resourcesViewed}</strong></div>
            <div class="session-metric-line"><span>Current session only</span><strong>On</strong></div>
          </article></div></section>
      <section class="dashboard-panel time-panel"><div class="panel-heading"><div><p class="eyebrow">Time in this session</p><h2>Time on learning activities</h2></div></div><div class="time-grid">${timeRows}</div></section>
      <p class="privacy-note">Your answers and session metrics are processed locally in this page. They are not sent to a server or written to long-term storage.</p>`;
  }

  function nextPage(id) {
    const index = course.site_navigation.findIndex((item) => item.page_id === id);
    return course.site_navigation[Math.min(index + 1, course.site_navigation.length - 1)].page_id;
  }

  function scoreMessage(score) {
    const message = rubric.feedback_messages.find((item) => {
      const parts = item.score_range.split('-').map(Number);
      return score >= parts[0] && score <= parts[1];
    });
    return message ? message.message : '';
  }

  function feedbackDetails(scenario, ratings, score) {
    const text = String(state.answers[scenario.id] || '').trim();
    const words = text.match(/\b[\w'-]+\b/g) || [];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const highRatings = rubric.checklist_items.filter((item) => Number(ratings[item.id]) === 3).map((item) => item.label.replace(/[.]$/, ''));
    const revisitRatings = rubric.checklist_items.filter((item) => Number(ratings[item.id]) <= 2);
    const suggestions = [];
    const signals = data.rubric.feedback_rubric.practice_feedback?.star_step_signals;
    if (scenario.skill_focus.includes('STAR method') && signals) {
      const lower = text.toLowerCase();
      const missingSteps = Object.entries(signals).filter(([, cues]) => !cues.some((cue) => lower.includes(cue.toLowerCase()))).map(([step]) => step);
      if (text && missingSteps.length) suggestions.push(`Quick STAR cue check: consider whether your response makes ${missingSteps.join(', ')} clear. This checks for a few wording cues and may miss equivalent phrasing.`);
      else if (text) suggestions.push('Your response contains cues for all four STAR steps. Review that the story flows clearly from context to result.');
    }
    const recommendedSentences = Number(data.mockInterview.activity.learner_input.minimum_recommended_sentences || 4);
    if (text && sentences.length < recommendedSentences) suggestions.push(`The activity recommends about ${recommendedSentences} sentences. Consider adding enough detail to show the context, what you did, and what happened.`);
    if (revisitRatings.length) suggestions.push(`You marked these areas as still developing: ${revisitRatings.map((item) => `${item.label.replace(/[.]$/, '')} — ${item.description}`).join('; ')}.`);
    if (!revisitRatings.length && highRatings.length) suggestions.push('You rated each checklist area Strong. Keep practicing aloud so the response sounds natural.');
    if (!text) suggestions.push('Add a draft answer to get a more useful practice review.');
    return { score, words: words.length, strengths: highRatings, suggestions };
  }

  function renderRubric(scenario) {
    const scenarioId = scenario.id;
    const ratings = state.ratings[scenarioId] || (state.ratings[scenarioId] = Object.create(null));
    const open = Boolean(state.rubricOpen[scenarioId]);
    const selected = rubric.checklist_items.filter((item) => ratings[item.id] != null);
    const total = selected.reduce((sum, item) => sum + Number(ratings[item.id]), 0);
    const isComplete = selected.length === rubric.checklist_items.length;
    const feedback = isComplete ? feedbackDetails(scenario, ratings, total) : null;
    return `<section class="rubric-panel ${open ? 'is-open' : ''}" id="rubric-panel" aria-label="Self-assessment checklist">
      <h3>${escapeHtml(rubric.title)}</h3><p class="rubric-intro">Rate your answer against each item. This is for your own practice; it is not an automated evaluation.</p>
      <div class="rubric-list">${rubric.checklist_items.map((item) => {
        const currentRating = String(ratings[item.id] || '');
        const options = rubric.rating_scale.map((scale) => `<option value="${scale.value}" ${currentRating === String(scale.value) ? 'selected' : ''}>${scale.value} — ${escapeHtml(scale.label)}</option>`).join('');
        return `<div class="rubric-row"><label for="rate-${escapeHtml(scenarioId)}-${escapeHtml(item.id)}">${escapeHtml(item.label)}<br><span class="field-hint">${escapeHtml(item.description)}</span></label>
          <select id="rate-${escapeHtml(scenarioId)}-${escapeHtml(item.id)}" data-rating="${escapeHtml(item.id)}" aria-label="Rate: ${escapeHtml(item.label)}"><option value="">Choose a rating</option>${options}</select></div>`;
      }).join('')}
      </div>
      <div class="score-result ${isComplete ? 'is-visible' : ''}" aria-live="polite">${isComplete ? `<strong>Your self-check: ${total} / 21</strong><p>${escapeHtml(scoreMessage(total))}</p><p class="feedback-meta">Your draft contains ${feedback.words} words.</p>${feedback.strengths.length ? `<div class="feedback-list"><b>Strengths you identified</b><ul>${feedback.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}<div class="feedback-list"><b>Suggestions to consider</b><ul>${feedback.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><p class="feedback-disclaimer">${escapeHtml(data.rubric.feedback_rubric.practice_feedback.disclaimer)}</p>` : 'Choose a rating for each item to see your self-assessment feedback.'}</div>
    </section>`;
  }

  function renderMockInterview() {
    const scenario = scenarios[state.scenarioIndex];
    const ratings = state.ratings[scenario.id] || Object.create(null);
    const progress = scenarios.map((item, i) => `<span class="scenario-dot ${i === state.scenarioIndex ? 'active' : i < state.scenarioIndex ? 'done' : ''}" aria-hidden="true"></span>`).join('');
    const tips = (scenario.response_tips || []).map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
    const note = scenario.important_note ? `<div class="notice">${escapeHtml(scenario.important_note)}</div>` : '';
    return `<section class="activity-header"><div><p class="eyebrow">Practice activity</p><h1>Mock interview</h1><p class="lede">${escapeHtml(data.mockInterview.activity.instructions)}</p></div><span class="counter">Question ${state.scenarioIndex + 1} of ${scenarios.length} • ${metrics.attemptedQuestions.size} tried</span></section>
      <div class="scenario-progress" aria-label="Question ${state.scenarioIndex + 1} of ${scenarios.length}">${progress}</div>
      <article class="scenario-card"><p class="eyebrow">${escapeHtml(scenario.title)}</p><p class="scenario-context">${escapeHtml(scenario.context)}</p>
        <p class="question-label">Interview question</p><h2 class="scenario-question">${escapeHtml(scenario.question)}</h2>
        <div class="tips"><h3>Tips for your response</h3><ul>${tips}</ul></div>${note}
        <label class="answer-label" for="answer-box">Draft your answer</label>
        <textarea class="answer-area" id="answer-box" placeholder="${escapeHtml(data.mockInterview.activity.learner_input.placeholder)}">${escapeHtml(state.answers[scenario.id] || '')}</textarea>
        <p class="field-hint">Your answer is only held temporarily in this page. Refreshing or closing the tab clears it.</p>
        <div class="scenario-actions"><button class="text-btn" type="button" data-action="toggle-rubric">${state.rubricOpen[scenario.id] ? 'Hide self-assessment' : 'Review with self-assessment'} <span aria-hidden="true">↗</span></button>
          <div class="button-row"><button class="secondary-btn" type="button" data-action="previous-scenario" ${state.scenarioIndex === 0 ? 'disabled' : ''}>← Previous</button>
            ${state.scenarioIndex < scenarios.length - 1 ? '<button class="primary-btn" type="button" data-action="next-scenario">Next question →</button>' : '<button class="primary-btn" type="button" data-action="go-reflection">Finish practice →</button>'}</div></div>
        ${renderRubric(scenario)}</article>`;
  }

  function renderReflection() {
    const prompts = reflection.reflection_prompts.map((item, index) => `<div class="reflection-item"><label for="reflection-${escapeHtml(item.id)}">${index + 1}. ${escapeHtml(item.question)}</label><textarea class="reflection-area" id="reflection-${escapeHtml(item.id)}" data-reflection="${escapeHtml(item.id)}" placeholder="Write a few thoughts...">${escapeHtml(state.reflections[item.id] || '')}</textarea><p class="field-hint">${escapeHtml(item.purpose)}</p></div>`).join('');
    return `<section class="lesson-intro"><p class="eyebrow">Practice activity • Final step</p><h1>Reflect and plan your next step.</h1><p class="reflection-intro">${escapeHtml(reflection.instructions)}</p></section>
      <section class="reflection-list">${prompts}</section>
      <div class="scenario-actions"><button class="secondary-btn" type="button" data-action="back-to-mock">← Back to mock interview</button><button class="primary-btn" type="button" data-action="complete-reflection">Finish reflection <span aria-hidden="true">✓</span></button></div>
      <div class="complete-banner ${state.reflectionComplete ? 'is-visible' : ''}" role="status"><strong>You completed this practice module.</strong>${escapeHtml(reflection.completion_message)}</div>`;
  }

  function render() {
    const id = pageId();
    drawNavigation();
    crumb.textContent = pageTitle(id);
    if (id === 'home') content.innerHTML = renderHome();
    else if (id === 'session-dashboard') content.innerHTML = renderDashboard();
    else if (id === 'mock-interview') content.innerHTML = renderMockInterview();
    else if (id === 'reflection') content.innerHTML = renderReflection();
    else if (id === 'work-authorization') content.innerHTML = renderWorkAuthorization();
    else content.innerHTML = renderLesson(id);
    document.title = `${pageTitle(id)} | Interview Ready`;
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
  }

  content.addEventListener('input', (event) => {
    if (event.target.id === 'answer-box') {
      const scenario = scenarios[state.scenarioIndex];
      state.answers[scenario.id] = event.target.value;
      if (event.target.value.trim()) metrics.attemptedQuestions.add(scenario.id);
    }
    if (event.target.matches('[data-reflection]')) state.reflections[event.target.dataset.reflection] = event.target.value;
  });

  content.addEventListener('change', (event) => {
    if (event.target.id === 'answer-box') {
      const scenarioId = scenarios[state.scenarioIndex].id;
      const value = event.target.value;
      const baseline = state.answerBaselines[scenarioId];
      if (baseline !== undefined && baseline !== value) metrics.responseRevisions += 1;
      state.answerBaselines[scenarioId] = value;
    }
  });

  content.addEventListener('change', (event) => {
    if (event.target.matches('[data-rating]')) {
      const scenarioId = scenarios[state.scenarioIndex].id;
      const values = state.ratings[scenarioId] || (state.ratings[scenarioId] = Object.create(null));
      const wasComplete = rubric.checklist_items.every((item) => values[item.id] != null);
      if (event.target.value === '') delete values[event.target.dataset.rating];
      else values[event.target.dataset.rating] = event.target.value;
      const isComplete = rubric.checklist_items.every((item) => values[item.id] != null);
      if (!wasComplete && isComplete && state.rubricOpen[scenarioId]) metrics.feedbackViews += 1;
      const panel = document.getElementById('rubric-panel');
      const focused = event.target.dataset.rating;
      if (panel) {
        const replacement = document.createElement('div');
        replacement.innerHTML = renderRubric(scenarios[state.scenarioIndex]);
        const nextPanel = replacement.firstElementChild;
        panel.replaceWith(nextPanel);
        const select = nextPanel.querySelector(`[data-rating="${CSS.escape(focused)}"]`);
        if (select) select.focus();
      }
    }
  });

  content.addEventListener('click', (event) => {
    const topicButton = event.target.closest('[data-topic]');
    if (topicButton) {
      state.selectedTopic = topicButton.dataset.topic;
      render();
      return;
    }
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === 'toggle-rubric') {
      const id = scenarios[state.scenarioIndex].id;
      state.rubricOpen[id] = !state.rubricOpen[id];
      const allRated = rubric.checklist_items.every((item) => state.ratings[id]?.[item.id] != null);
      if (state.rubricOpen[id] && allRated) metrics.feedbackViews += 1;
      render();
      document.getElementById('rubric-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (action === 'complete-lesson') {
      const lessonId = actionButton.dataset.page;
      if (lessonPages.some((page) => page.id === lessonId)) metrics.completedLessons.add(lessonId);
      render();
    } else if (action === 'toggle-resources') {
      state.resourcesOpen = !state.resourcesOpen;
      if (state.resourcesOpen) metrics.resourcesViewed += 1;
      render();
    } else if (action === 'open-question') {
      state.scenarioIndex = Number(actionButton.dataset.index) || 0;
      window.location.hash = 'mock-interview';
    } else if (action === 'previous-scenario') {
      state.scenarioIndex = Math.max(0, state.scenarioIndex - 1); render();
    } else if (action === 'next-scenario') {
      state.scenarioIndex = Math.min(scenarios.length - 1, state.scenarioIndex + 1); render();
      content.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'go-reflection') {
      metrics.completedActivities.add('mock-interview');
      window.location.hash = 'reflection';
    } else if (action === 'back-to-mock') {
      window.location.hash = 'mock-interview';
    } else if (action === 'complete-reflection') {
      state.reflectionComplete = true;
      metrics.completedActivities.add('reflection');
      render();
      document.querySelector('.complete-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.getElementById('menu-toggle').addEventListener('click', () => {
    const open = !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', open); scrim.hidden = !open;
    document.getElementById('menu-toggle').setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeMenu);
  window.addEventListener('hashchange', () => {
    flushPageTime();
    const next = pageId();
    trackPageEntry(next);
    render();
    window.scrollTo(0, 0);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushPageTime();
    else pageEnteredAt = performance.now();
  });
  trackPageEntry(pageId());
  render();
})();
