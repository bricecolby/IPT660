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

  const icons = ['⌂', '↗', '≋', '✧', '▤', '↻'];
  const escapeHtml = (value) => String(value == null ? '' : value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  function pageId() {
    const hash = window.location.hash.replace(/^#/, '');
    return course.site_navigation.some((item) => item.page_id === hash) ? hash : 'home';
  }

  function pageTitle(id) {
    const item = course.site_navigation.find((entry) => entry.page_id === id);
    return item ? item.label : 'Home';
  }

  function drawNavigation() {
    const current = pageId();
    nav.innerHTML = course.site_navigation.map((item, index) => `
      <a class="nav-link" href="#${escapeHtml(item.page_id)}" ${item.page_id === current ? 'aria-current="page"' : ''}>
        <span class="nav-icon" aria-hidden="true">${icons[index] || '•'}</span>
        <span>${escapeHtml(item.label)}</span>
      </a>`).join('');
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
    return `<section class="lesson-intro"><p class="eyebrow">Interview Ready • Lesson</p><h1>${escapeHtml(page.title)}</h1><p class="lede">${escapeHtml(page.purpose)}</p></section>
      <section class="lesson-grid">${(page.content_blocks || []).map(renderBlock).join('')}</section>
      <div class="section-heading"><a class="secondary-btn" href="#${escapeHtml(nextPage(id))}">Continue <span aria-hidden="true">→</span></a></div>`;
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

  function renderRubric(scenario) {
    const scenarioId = scenario.id;
    const ratings = state.ratings[scenarioId] || (state.ratings[scenarioId] = Object.create(null));
    const open = Boolean(state.rubricOpen[scenarioId]);
    const selected = rubric.checklist_items.filter((item) => ratings[item.id] != null);
    const total = selected.reduce((sum, item) => sum + Number(ratings[item.id]), 0);
    const isComplete = selected.length === rubric.checklist_items.length;
    return `<section class="rubric-panel ${open ? 'is-open' : ''}" id="rubric-panel" aria-label="Self-assessment checklist">
      <h3>${escapeHtml(rubric.title)}</h3><p class="rubric-intro">Rate your answer against each item. This is for your own practice; it is not an automated evaluation.</p>
      <div class="rubric-list">${rubric.checklist_items.map((item) => {
        const currentRating = String(ratings[item.id] || '');
        const options = rubric.rating_scale.map((scale) => `<option value="${scale.value}" ${currentRating === String(scale.value) ? 'selected' : ''}>${scale.value} — ${escapeHtml(scale.label)}</option>`).join('');
        return `<div class="rubric-row"><label for="rate-${escapeHtml(scenarioId)}-${escapeHtml(item.id)}">${escapeHtml(item.label)}<br><span class="field-hint">${escapeHtml(item.description)}</span></label>
          <select id="rate-${escapeHtml(scenarioId)}-${escapeHtml(item.id)}" data-rating="${escapeHtml(item.id)}" aria-label="Rate: ${escapeHtml(item.label)}"><option value="">Choose a rating</option>${options}</select></div>`;
      }).join('')}
      </div>
      <div class="score-result ${isComplete ? 'is-visible' : ''}" aria-live="polite">${isComplete ? `<strong>Your self-check: ${total} / 21</strong>${escapeHtml(scoreMessage(total))}` : 'Choose a rating for each item to see the rubric’s practice suggestion.'}</div>
    </section>`;
  }

  function renderMockInterview() {
    const scenario = scenarios[state.scenarioIndex];
    const ratings = state.ratings[scenario.id] || Object.create(null);
    const progress = scenarios.map((item, i) => `<span class="scenario-dot ${i === state.scenarioIndex ? 'active' : i < state.scenarioIndex ? 'done' : ''}" aria-hidden="true"></span>`).join('');
    const tips = (scenario.response_tips || []).map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
    const note = scenario.important_note ? `<div class="notice">${escapeHtml(scenario.important_note)}</div>` : '';
    return `<section class="activity-header"><div><p class="eyebrow">Practice activity</p><h1>Mock interview</h1><p class="lede">${escapeHtml(data.mockInterview.activity.instructions)}</p></div><span class="counter">Question ${state.scenarioIndex + 1} of ${scenarios.length}</span></section>
      <div class="scenario-progress" aria-label="Question ${state.scenarioIndex + 1} of ${scenarios.length}">${progress}</div>
      <article class="scenario-card"><p class="eyebrow">${escapeHtml(scenario.title)}</p><p class="scenario-context">${escapeHtml(scenario.context)}</p>
        <p class="question-label">Interview question</p><h2 class="scenario-question">${escapeHtml(scenario.question)}</h2>
        <div class="tips"><h3>Tips for your response</h3><ul>${tips}</ul></div>${note}
        <label class="answer-label" for="answer-box">Draft your answer</label>
        <textarea class="answer-area" id="answer-box" placeholder="${escapeHtml(data.mockInterview.activity.learner_input.placeholder)}">${escapeHtml(state.answers[scenario.id] || '')}</textarea>
        <p class="field-hint">Your answer is only held temporarily in this page. Refreshing or closing the tab clears it.</p>
        <div class="scenario-actions"><button class="text-btn" type="button" data-action="toggle-rubric">${state.rubricOpen[scenario.id] ? 'Hide self-assessment' : 'Review with self-assessment'} <span aria-hidden="true">↗</span></button>
          <div class="button-row"><button class="secondary-btn" type="button" data-action="previous-scenario" ${state.scenarioIndex === 0 ? 'disabled' : ''}>← Previous</button>
            ${state.scenarioIndex < scenarios.length - 1 ? '<button class="primary-btn" type="button" data-action="next-scenario">Next question →</button>' : '<button class="primary-btn" type="button" data-action="go-reflection">Continue to reflection →</button>'}</div></div>
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
    else if (id === 'mock-interview') content.innerHTML = renderMockInterview();
    else if (id === 'reflection') content.innerHTML = renderReflection();
    else content.innerHTML = renderLesson(id);
    document.title = `${pageTitle(id)} | Interview Ready`;
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
  }

  content.addEventListener('input', (event) => {
    if (event.target.id === 'answer-box') state.answers[scenarios[state.scenarioIndex].id] = event.target.value;
    if (event.target.matches('[data-reflection]')) state.reflections[event.target.dataset.reflection] = event.target.value;
  });

  content.addEventListener('change', (event) => {
    if (event.target.matches('[data-rating]')) {
      const scenarioId = scenarios[state.scenarioIndex].id;
      const values = state.ratings[scenarioId] || (state.ratings[scenarioId] = Object.create(null));
      if (event.target.value === '') delete values[event.target.dataset.rating];
      else values[event.target.dataset.rating] = event.target.value;
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
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === 'toggle-rubric') {
      const id = scenarios[state.scenarioIndex].id;
      state.rubricOpen[id] = !state.rubricOpen[id];
      render();
      document.getElementById('rubric-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (action === 'previous-scenario') {
      state.scenarioIndex = Math.max(0, state.scenarioIndex - 1); render();
    } else if (action === 'next-scenario') {
      state.scenarioIndex = Math.min(scenarios.length - 1, state.scenarioIndex + 1); render();
      content.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'go-reflection') {
      window.location.hash = 'reflection';
    } else if (action === 'back-to-mock') {
      window.location.hash = 'mock-interview';
    } else if (action === 'complete-reflection') {
      state.reflectionComplete = true; render();
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
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
})();
