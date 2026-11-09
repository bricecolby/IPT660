const app = document.querySelector('#app-view');
const navButtons = [...document.querySelectorAll('[data-view]')];

const state = {
  view: 'dashboard',
  activeModuleId: null,
  openedSections: new Set(),
  checkedTasks: new Set(),
  quizIndex: 0,
  selectedAnswer: null,
  quizUnlocked: false,
  moduleCompleted: false,
  answeredQuestions: new Set(),
  correctAnswers: new Set(),
  quizFinished: false,
};

const moduleSources = [
  'email-signature-module.json',
  'google-voice-setup-module.json',
  'mentor-expectations-module.json',
];
const moduleChecklistOverrides = {
  'm01-email-signature': [
    'Open Gmail settings and find the Signature section.',
    'Enter the approved UOS signature details and save changes.',
    'Open a new message and verify that the signature appears.',
  ],
  'm02-google-voice-setup': [
    'Use the Google email link to connect your personal phone to your assigned number.',
    'Record a greeting with your name and Utah Online School.',
    'Review the optional call screening and caller ID settings.',
    'Set working hours if you want calls sent to voicemail outside your schedule.',
    'Use the Google Voice app to place calls and check voicemail.',
    'Add the Utah Online contact if you enable caller ID for forwarded calls.',
  ],
  'm03-mentor-expectations': [
    'Review the monthly and weekly communication expectations.',
    'Review expectations for student onboarding, parent support, and progress reports.',
    'Review how to monitor progress and set goals with students.',
    'Review meeting, documentation, administrator notification, and privacy expectations.',
  ],
};
const lessonProgress = new Map();
let lessonModules = [];
let moduleData;

async function loadModules() {
  try {
    lessonModules = await Promise.all(moduleSources.map(loadModule));
    moduleData = lessonModules[0];
    state.activeModuleId = moduleData.moduleId;
    render();
  } catch (error) {
    app.innerHTML = `<div class="page-wrap"><div class="empty-state"><h1>Lesson content could not be loaded</h1><p>Open this project through a local web server so the browser can load lesson JSON from the linked <strong>IPT660/content</strong> folder.</p><p>In VS Code, use Live Server on index.html, or run the local server instructions in the README.</p></div></div>`;
  }
}

async function loadModule(filename) {
  let lastError;
  for (const source of [`./lesson_content/${filename}`, `../content/${filename}`, `./content/${filename}`]) {
    try {
      const response = await fetch(source);
      if (response.ok) return response.json();
      lastError = new Error(`Unable to load ${source}.`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Unable to load ${filename}.`);
}

function refreshNav() {
  navButtons.forEach(button => {
    const condensedNav = state.view === 'dashboard' || state.view === 'profile';
    button.hidden = condensedNav && button.dataset.view !== 'dashboard';
    button.classList.toggle('active', button.dataset.view === state.view);
    if (button.dataset.view === 'quiz') {
      const unlocked = isQuizUnlocked();
      button.disabled = !unlocked;
      button.textContent = unlocked ? 'Quiz' : 'Quiz · Locked';
      button.title = unlocked ? '' : 'Complete all practice steps to unlock the quiz';
      button.setAttribute('aria-label', unlocked ? 'Quiz' : 'Quiz locked until all practice steps are complete');
    }
  });
}

function taskCount(module = moduleData) {
  return practiceSteps(module).length;
}

function lessonSections(module = moduleData) {
  if (!module) return [];
  return module.sections.filter(section => section.heading.trim().toLowerCase() !== 'current session progress');
}

function viewedSectionCount(module, progress = lessonProgress.get(module.moduleId)) {
  return lessonSections(module).filter(section => progress?.openedSections.has(section.sectionId)).length;
}

function moduleIsComplete(module, progress = lessonProgress.get(module.moduleId)) {
  return Boolean(progress?.moduleCompleted || (progress?.quizFinished && progress.checkedTasks.size >= taskCount(module)));
}

function moduleIsStarted(module, progress = lessonProgress.get(module.moduleId)) {
  return Boolean(progress && (viewedSectionCount(module, progress) || progress.checkedTasks.size || progress.answeredQuestions.size));
}

function isQuizUnlocked(moduleId = state.activeModuleId) {
  const module = lessonModules.find(item => item.moduleId === moduleId);
  if (!module) return false;
  if (moduleId === state.activeModuleId) {
    return state.quizUnlocked || state.checkedTasks.size >= taskCount(module);
  }
  const progress = lessonProgress.get(moduleId);
  return Boolean(progress?.quizUnlocked || (progress && progress.checkedTasks.size >= taskCount(module)));
}

function practiceSteps(module = moduleData) {
  if (!module) return [];
  return module.assignments[0].checklist || moduleChecklistOverrides[module.moduleId] || [module.assignments[0].title];
}

function mentorExpectationsSection(sectionId) {
  const resourceLink = (url, label) => `<a class="lesson-resource-link" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const content = {
    s1: `<p class="lesson-section-intro">Mentors are an important part of the State Online Education Program (SOEP) team. This lesson focuses on four parts of the role:</p>
      <ul class="lesson-highlight-list"><li>Communicating with students and parents</li><li>Monitoring progress and setting goals</li><li>Helping students and parents get started</li><li>Documenting important issues and keeping the school team informed</li></ul>`,
    s2: `<div class="lesson-content-group"><h3>Keep a regular rhythm</h3><ul><li>Contact every student or parent at least <strong>once a month</strong>.</li><li>Contact students identified as RED or at risk <strong>weekly</strong>.</li><li>Send the weekly progress report email to all students on <strong>Wednesday afternoons</strong>.</li></ul></div>
      <div class="lesson-content-group"><h3>Welcome and encourage new students</h3><ul><li>Send a welcome letter introducing yourself as their mentor.</li><li>During their first two weeks, help them log in and begin working, including through the 15 Day email.</li><li>Encourage them to complete the onboarding course.</li></ul></div>
      <div class="lesson-content-group"><h3>Build relationships</h3><p>Get to know students, follow up with them, and consider monthly incentives to encourage connection and success.</p></div>
      <aside class="lesson-resource-card"><strong>Reference</strong>${resourceLink('https://docs.google.com/a/washonline.org/document/d/1ZFmQ-8fcUJiSuS12-OX6I_ZKLIYE9rzxNWLgvhxGNDg/edit?usp=sharing', 'Green Yellow RED interventions document')}</aside>`,
    s3: `<div class="lesson-content-group"><h3>Check progress and student information</h3><ul><li>Track progress in the student’s learning platform: Edgenuity or Canvas.</li><li>Verify student information in the SIS.</li></ul></div>
      <div class="lesson-content-group"><h3>Find Canvas progress in the SIS</h3><ol class="lesson-route-list"><li>Find the student.</li><li>Select <strong>Enrollments</strong>.</li><li>Choose <strong>Gradebook</strong>.</li><li>Select a Canvas course.</li></ol></div>
      <div class="lesson-content-group"><h3>Set goals together</h3><p>Work with each student to set individual goals and make a plan together. Check progress, follow up, and celebrate progress along the way.</p></div>`,
    s4: `<div class="lesson-content-group"><h3>Support new students</h3><p>Especially during the first two weeks, help students log in and begin working.</p><p>Encourage new students to complete the onboarding course: ${resourceLink('https://docs.google.com/a/washonline.org/spreadsheets/d/1OUFfxxeowyolnjkZpxTrecKWKr9RQJsu9Q649y2brYc/edit?usp=sharing', 'Open the onboarding course')}</p></div>
      <div class="lesson-content-group"><h3>Help parents and families</h3><p>When requested, help parents set up guardian accounts in the SIS and show them how to use the accounts. ${resourceLink('https://docs.google.com/a/washonline.org/document/d/1TcD_Jxb5YXqRZ8hRX48Scj7ykjcHtmxCMAdxLB11VBc/edit?usp=sharing', 'View guardian account instructions')}</p></div>
      <div class="lesson-content-group"><h3>Support the wider school community</h3><ul><li>Assist with state test proctoring when needed.</li><li>Help with social events in your area.</li></ul></div>`,
    s5: `<div class="lesson-content-group"><h3>Participate in team routines</h3><p>Attend staff and mentor meetings, and submit the attendance form promptly.</p></div>
      <div class="lesson-content-group"><h3>Document significant communication</h3><p>Log important emails and communications in the SIS, such as a family death or another significant event.</p></div>
      <div class="lesson-content-group"><h3>Escalate concerns and protect privacy</h3><ul><li>Notify an administrator about significant or inappropriate student emails or issues.</li><li>Keep student information private and use approved school systems when documenting student details.</li></ul></div>`,
  };
  return content[sectionId] || null;
}

function emailSignatureSection(sectionId) {
  const content = {
    s1: `<p class="lesson-section-intro">Create and save your UOS Gmail signature, then verify it appears in a new message.</p>
      <ol class="lesson-highlight-list lesson-numbered-highlights"><li>Open Gmail settings.</li><li>Create and save your signature.</li><li>Verify it in a new message.</li></ol>`,
    s2: `<div class="lesson-content-group"><h3>Open the Signature settings</h3><ol class="lesson-route-list"><li>Sign in to your UOS Gmail account.</li><li>Select the <strong>gear icon</strong> in the upper-right corner.</li><li>Select <strong>Settings</strong>.</li><li>In General settings, scroll to the <strong>Signature</strong> section.</li></ol></div>`,
    s3: `<div class="lesson-content-group"><h3>Enter and save your signature</h3><ol class="lesson-route-list"><li>Enter the approved UOS signature information in the Signature section.</li><li>Select <strong>Save Changes</strong> before leaving Settings.</li></ol></div>
      <aside class="safety-note">The training tool does not automatically access or change your Gmail account.</aside>`,
    s4: `<div class="lesson-content-group"><h3>Check that it worked</h3><ol class="lesson-route-list"><li>Open a new email message in Gmail.</li><li>Confirm that your signature appears.</li><li>Return to this module and complete the assignment checklist.</li></ol></div>
      <aside class="safety-note">Do not enter your email password or other private account information into the training tool.</aside>`,
  };
  return content[sectionId] || null;
}

function googleVoiceSection(sectionId) {
  const voiceSettings = 'https://voice.google.com/u/1/settings#availabilitysettings';
  const calendarSettings = 'https://calendar.google.com/calendar/u/1/r/settings';
  const content = {
    s1: `<p class="lesson-section-intro">Set up your school-issued Google Voice number for work calls.</p>
      <ul class="lesson-highlight-list"><li>Activate your assigned number.</li><li>Record a voicemail greeting.</li><li>Choose any optional call settings you need.</li><li>Place calls using Google Voice.</li></ul>`,
    s2: `<div class="lesson-content-group"><h3>Activate your assigned number</h3><ol class="lesson-route-list"><li>Shortly after your start date, the school will issue your Google Voice number and Google will email you.</li><li>Open the email and select its link to connect your personal phone number to the account.</li></ol></div>
      <div class="lesson-content-group"><h3>If Google asks for a primary location</h3><p>Enter the school office address: <strong>2060 N 2100 W, St. George, UT 84770</strong>.</p></div>
      <div class="lesson-content-group"><h3>After activation</h3><ul><li>The school will post your Google Voice number on its website.</li><li>Include the number in your email signature.</li></ul></div>
      <aside class="lesson-resource-card"><strong>Choose how to use Google Voice</strong><span>Open it in a browser, in the phone app, or in both places.</span><a class="lesson-resource-link" href="https://voice.google.com" target="_blank" rel="noopener noreferrer">Open Google Voice ↗</a></aside>`,
    s3: `<div class="lesson-content-group"><h3>Record your greeting</h3><ol class="lesson-route-list"><li>In Google Voice settings, select <strong>Voicemail</strong>.</li><li>Select <strong>Record a greeting</strong>.</li></ol></div>
      <aside class="lesson-resource-card"><strong>Your greeting must include</strong><span>Your name and a statement that you are with Utah Online School.</span></aside>`,
    s4: `<p class="lesson-section-intro">These call settings are optional. Choose the setup that works for your calls.</p>
      <div class="lesson-content-group"><h3>Call screening</h3><p>When screening is on, callers state their name before the call is forwarded to you. This can delay the call, and students may hang up while waiting.</p><ol class="lesson-route-list"><li>Use a laptop or desktop computer.</li><li>In Google Voice settings, select <strong>Calls</strong> on the left.</li><li>Turn off <strong>Screen calls</strong> if you want to disable screening.</li></ol></div>
      <div class="lesson-content-group"><h3>Caller ID for forwarded calls</h3><p>You can turn on <strong>Show my Google Voice Number as Caller ID when forwarding calls</strong> to help recognize work calls.</p></div>`,
    s5: `<p class="lesson-section-intro">You can have Google Voice send calls to voicemail outside your regular work hours. This setting is optional.</p>
      <div class="lesson-content-group"><h3>Set up working hours</h3><ol class="lesson-route-list"><li>In Google Calendar settings, open <strong>Working hours &amp; location</strong> and check <strong>Enable working hours</strong>.</li><li>In Google Voice availability settings, turn on <strong>Follow working hours</strong>.</li></ol></div>
      <aside class="lesson-resource-card"><strong>Open settings</strong><a class="lesson-resource-link" href="${voiceSettings}" target="_blank" rel="noopener noreferrer">Google Voice availability settings ↗</a><a class="lesson-resource-link" href="${calendarSettings}" target="_blank" rel="noopener noreferrer">Google Calendar settings ↗</a></aside>`,
    s6: `<div class="lesson-content-group"><h3>Place calls and check voicemail</h3><ul><li>Use the Google Voice app on your phone to place calls so students see your Google Voice number instead of your personal number.</li><li>The app is also the quickest way to check Google Voice voicemail.</li><li>You do not need the app to receive calls.</li></ul></div>
      <div class="lesson-content-group"><h3>Recognize forwarded work calls</h3><p>If you turn on caller ID for forwarded calls, add a phone contact named <strong>Utah Online</strong> using your Google Voice number. Calls directed to Google Voice can then appear as Utah Online on your phone.</p></div>`,
  };
  return content[sectionId] || null;
}

function saveActiveProgress() {
  if (!state.activeModuleId) return;
  state.quizUnlocked = state.quizUnlocked || state.checkedTasks.size >= taskCount();
  state.moduleCompleted = state.moduleCompleted || (state.quizFinished && state.checkedTasks.size >= taskCount());
  lessonProgress.set(state.activeModuleId, {
    openedSections: new Set(state.openedSections),
    checkedTasks: new Set(state.checkedTasks),
    quizIndex: state.quizIndex,
    selectedAnswer: state.selectedAnswer,
    quizUnlocked: state.quizUnlocked,
    moduleCompleted: state.moduleCompleted,
    expandedSection: state.expandedSection,
    answeredQuestions: new Set(state.answeredQuestions),
    correctAnswers: new Set(state.correctAnswers),
    quizFinished: state.quizFinished,
  });
}

function loadProgress(moduleId) {
  const progress = lessonProgress.get(moduleId);
  state.openedSections = new Set(progress?.openedSections || []);
  state.checkedTasks = new Set(progress?.checkedTasks || []);
  state.quizIndex = progress?.quizIndex || 0;
  state.selectedAnswer = progress?.selectedAnswer ?? null;
  const module = lessonModules.find(item => item.moduleId === moduleId);
  state.quizUnlocked = Boolean(progress?.quizUnlocked || (progress && progress.checkedTasks.size >= taskCount(module)));
  state.moduleCompleted = Boolean(progress?.moduleCompleted || (progress?.quizFinished && progress.checkedTasks.size >= taskCount(module)));
  state.expandedSection = progress?.expandedSection || null;
  state.answeredQuestions = new Set(progress?.answeredQuestions || []);
  state.correctAnswers = new Set(progress?.correctAnswers || []);
  state.quizFinished = progress?.quizFinished || false;
}

function render() {
  saveActiveProgress();
  refreshNav();
  if (state.view === 'dashboard') renderDashboard();
  if (state.view === 'lesson') renderLesson();
  if (state.view === 'quiz') renderQuiz();
  if (state.view === 'profile') renderProfile();
}

function renderDashboard() {
  const completedModules = lessonModules.filter(module => moduleIsComplete(module)).length;
  app.innerHTML = `<div class="page-wrap">
    <div class="dashboard-header">
      <p class="eyebrow">Dashboard · Current session</p>
      <h1>Ready to begin?</h1>
      <p class="lead">Start a lesson and your current-session progress will appear here.</p>
    </div>
    <section class="learning-path-card" aria-labelledby="learning-path-title">
      <div class="learning-path-heading"><div><h2 id="learning-path-title">Your learning path</h2><p>Complete the practice checklist and quiz in each module to finish it.</p></div><span>${completedModules} of ${lessonModules.length} complete</span></div>
      <div class="learning-path-track" style="--module-count:${lessonModules.length}">${lessonModules.map((module, index) => {
        const completed = moduleIsComplete(module);
        const started = !completed && moduleIsStarted(module);
        const status = completed ? 'Completed' : started ? 'In progress' : 'Not started';
        return `<div class="learning-path-step ${completed ? 'complete' : started ? 'in-progress' : ''}">
          <span class="learning-path-marker" aria-hidden="true">${completed ? '✓' : index + 1}</span>
          <div class="learning-path-copy"><small>Module ${index + 1}</small><strong>${module.title}</strong><span>${status}</span></div>
        </div>`;
      }).join('')}</div>
    </section>
    <section class="dashboard-lessons" aria-labelledby="lesson-practice-title">
      <div class="dashboard-section-heading"><div><h2 id="lesson-practice-title">Lessons and practice tasks</h2><p>Choose a module to continue learning, practice, and check your understanding.</p></div><span class="module-count">${lessonModules.length} modules</span></div>
      <div class="dashboard-module-grid">${lessonModules.map((module, index) => {
          const progress = lessonProgress.get(module.moduleId);
          const viewed = viewedSectionCount(module, progress);
          const taskDone = progress?.checkedTasks.size || 0;
          const quizDone = progress?.answeredQuestions.size || 0;
          const quizStatus = progress?.quizFinished
            ? `Complete · ${progress.correctAnswers.size}/${module.quizBank.length} correct`
            : quizDone ? `${quizDone} of ${module.quizBank.length} answered` : 'Not started';
          const quizUnlocked = isQuizUnlocked(module.moduleId);
          const icon = module.moduleId.includes('google-voice') ? '☎' : module.moduleId.includes('mentor-expectations') ? '◎' : '✉';
          return `<article class="dashboard-module-card">
            <div class="dashboard-module-heading"><span class="module-icon" aria-hidden="true">${icon}</span><div><p class="module-sequence">Module ${index + 1}</p><h3>${module.title}</h3></div></div>
            <p class="module-assignment-title">${module.assignments[0].title}</p>
            <div class="module-progress-list">
              <div><span>Lesson</span><strong>${viewed ? `${viewed} of ${lessonSections(module).length} viewed` : 'Not started'}</strong></div>
              <div><span>Practice</span><strong>${taskDone} of ${taskCount(module)} steps</strong></div>
              <div><span>Quiz</span><strong>${quizUnlocked ? quizStatus : 'Locked · finish practice first'}</strong></div>
            </div>
            <div class="module-actions"><button class="button" type="button" data-open-module="${module.moduleId}">${viewed ? 'Continue lesson' : 'Start lesson'}</button><button class="button secondary" type="button" data-open-quiz="${module.moduleId}" ${quizUnlocked ? '' : 'disabled'} aria-label="${quizUnlocked ? `${module.title} quiz` : `${module.title} quiz locked. Complete all practice steps to unlock it.`}">${quizUnlocked ? progress?.quizFinished ? 'Review quiz' : 'Start quiz' : 'Quiz locked'}</button></div>
          </article>`;
        }).join('')}</div>
    </section>
    <p class="session-note">Progress and metrics are stored temporarily in this browser and clear when the session ends.</p>
  </div>`;
  app.querySelectorAll('[data-open-module]').forEach(button => button.addEventListener('click', () => showLesson(button.dataset.openModule)));
  app.querySelectorAll('[data-open-quiz]').forEach(button => button.addEventListener('click', () => showQuiz(button.dataset.openQuiz)));
}

function selectModule(moduleId) {
  if (!lessonModules.some(module => module.moduleId === moduleId)) return false;
  if (moduleId !== state.activeModuleId) {
    saveActiveProgress();
    moduleData = lessonModules.find(module => module.moduleId === moduleId);
    state.activeModuleId = moduleId;
    loadProgress(moduleId);
  }
  return true;
}

function showLesson(moduleId = state.activeModuleId) {
  if (typeof moduleId !== 'string') moduleId = state.activeModuleId;
  if (moduleId && !selectModule(moduleId)) return;
  const sections = lessonSections(moduleData);
  if (!state.expandedSection && sections.length) {
    state.expandedSection = sections[0].sectionId;
    state.openedSections.add(state.expandedSection);
  }
  state.view = 'lesson';
  render();
}

function showDashboard() {
  state.view = 'dashboard';
  render();
}

function showQuiz(moduleId = state.activeModuleId) {
  if (typeof moduleId !== 'string') moduleId = state.activeModuleId;
  if (moduleId && !selectModule(moduleId)) return;
  if (!isQuizUnlocked()) {
    state.view = 'lesson';
    render();
    return;
  }
  state.view = 'quiz';
  render();
}

function showProfile() {
  state.view = 'profile';
  render();
}

function renderProfile() {
  app.innerHTML = `<div class="page-wrap">
    <div class="lesson-toolbar"><button class="back-link" type="button" data-action="dashboard">← Back to dashboard</button><span class="lesson-count">MENTOR PROFILE</span></div>
    <section class="profile-card" aria-labelledby="profile-name">
      <div class="profile-heading"><div class="profile-avatar" aria-hidden="true">JM</div><div><p class="eyebrow">New mentor</p><h1 id="profile-name">Jordan Miller</h1><p class="profile-subtitle">Utah Online School mentor</p></div></div>
      <div class="profile-details">
        <div class="profile-detail"><span>Hire Date</span><strong>November 5, 2026</strong></div>
        <div class="profile-detail"><span>Designation</span><strong>SOEP</strong></div>
        <div class="profile-detail"><span>Grades</span><strong>9–12</strong></div>
        <div class="profile-detail"><span>City</span><strong>Santaquin, UT</strong></div>
      </div>
    </section>
  </div>`;
  app.querySelector('[data-action="dashboard"]').addEventListener('click', showDashboard);
}

function renderLesson() {
  const moduleIndex = lessonModules.findIndex(module => module.moduleId === state.activeModuleId) + 1;
  const sections = lessonSections(moduleData);
  const activeSectionId = state.expandedSection || sections[0].sectionId;
  const activeSection = sections.find(section => section.sectionId === activeSectionId) || sections[0];
  const sectionIndex = sections.findIndex(section => section.sectionId === activeSection.sectionId);
  const safeBody = activeSection.body.replace('The training tool does not automatically access or change your Gmail account.', '<span class="safety-note">The training tool does not automatically access or change your Gmail account.</span>').replace('Do not enter your email password or other private information into the training tool.', '<span class="safety-note">Do not enter your email password or other private information into the training tool.</span>');
  const structuredContent = moduleData.moduleId === 'm03-mentor-expectations'
    ? mentorExpectationsSection(activeSection.sectionId)
    : moduleData.moduleId === 'm01-email-signature'
      ? emailSignatureSection(activeSection.sectionId)
      : moduleData.moduleId === 'm02-google-voice-setup'
        ? googleVoiceSection(activeSection.sectionId)
        : null;
  const quizUnlockNotice = activeSection.heading.trim().toLowerCase() === 'welcome to the lesson'
    ? '<aside class="lesson-quiz-note"><strong>How to unlock the quiz</strong><p>Complete every step in the Practice task checklist. Once all steps are checked, the Quiz tab and quiz button will unlock for this lesson.</p></aside>'
    : '';
  const sectionsHtml = sections.map((section, index) => {
    const viewed = state.openedSections.has(section.sectionId);
    const selected = index === sectionIndex;
    return `<button class="lesson-step-button ${selected ? 'current' : ''} ${viewed ? 'viewed' : ''}" type="button" data-section="${section.sectionId}" ${selected ? 'aria-current="step"' : ''}>
      <span class="lesson-step-number">${viewed ? '✓' : index + 1}</span><span class="lesson-step-copy"><strong>${section.heading}</strong><small>${selected ? 'Current section' : viewed ? 'Viewed' : 'Upcoming'}</small></span>
    </button>`;
  }).join('');
  const checklist = practiceSteps(moduleData);
  const viewedSections = sections.filter(section => state.openedSections.has(section.sectionId)).length;
  const sectionPct = Math.round(((sectionIndex + 1) / sections.length) * 100);
  app.innerHTML = `<div class="page-wrap">
    <div class="lesson-header"><p class="eyebrow">Lesson</p><h1>${moduleData.title}</h1><p class="lead">Follow the lesson, complete the practice task, then check your understanding.</p></div>
    ${state.quizFinished ? `<section class="lesson-quiz-score" aria-label="Quiz score"><span>Quiz complete</span><strong>Score: ${state.correctAnswers.size} of ${moduleData.quizBank.length}</strong></section>` : ''}
    <section class="lesson-stepper" aria-label="Lesson sequence">
      <div class="lesson-stepper-heading"><div><h2>Lesson sections</h2><span>Section ${sectionIndex + 1} of ${sections.length}</span></div><span class="lesson-stepper-viewed">${viewedSections} viewed</span></div>
      <div class="progress-track" role="progressbar" aria-label="Lesson sequence progress" aria-valuenow="${sectionIndex + 1}" aria-valuemin="1" aria-valuemax="${sections.length}"><div class="progress-fill" style="width:${sectionPct}%"></div></div>
      <div class="lesson-step-list">${sectionsHtml}</div>
    </section>
    <div class="lesson-layout">
      <div class="lesson-main-column">
        <article class="content-panel lesson-content-panel"><h2>${activeSection.heading}</h2><div class="lesson-section-body">${structuredContent || `<p>${safeBody}</p>`}</div>${quizUnlockNotice}
          <div class="lesson-step-actions"><button class="button secondary" type="button" data-action="previous" ${sectionIndex === 0 ? 'disabled' : ''}>← Previous</button>${sectionIndex < sections.length - 1 ? '<button class="button" type="button" data-action="next">Next section →</button>' : ''}</div>
        </article>
      </div>
      <section class="content-panel practice-panel" id="practice-panel" aria-labelledby="practice-title">
        <h2 id="practice-title">Practice task checklist</h2>
        <p class="side-description">Complete every step to unlock the quiz for this lesson.</p>
        <ul class="task-list">${checklist.map((item, index) => `<li><label><input type="checkbox" data-task="${index}" ${state.checkedTasks.has(index) ? 'checked' : ''}><span>${item}</span></label></li>`).join('')}</ul>
        ${isQuizUnlocked() ? '<button class="button quiz-go-button" type="button" data-action="quiz">Go to quiz →</button>' : ''}
      </section>
    </div>
  </div>`;
  app.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => toggleSection(button.dataset.section)));
  const previous = app.querySelector('[data-action="previous"]');
  if (previous) previous.addEventListener('click', () => toggleSection(sections[sectionIndex - 1].sectionId));
  const next = app.querySelector('[data-action="next"]');
  if (next) next.addEventListener('click', () => toggleSection(sections[sectionIndex + 1].sectionId));
  const quizButton = app.querySelector('[data-action="quiz"]');
  if (quizButton) quizButton.addEventListener('click', () => showQuiz());
  app.querySelectorAll('[data-task]').forEach(input => input.addEventListener('change', () => {
    const id = Number(input.dataset.task);
    input.checked ? state.checkedTasks.add(id) : state.checkedTasks.delete(id);
    render();
  }));
}

function toggleSection(id) {
  state.openedSections.add(id);
  state.expandedSection = id;
  render();
}

function renderQuiz() {
  if (state.quizFinished) return renderQuizResults();
  const question = moduleData.quizBank[state.quizIndex];
  const totalQuestions = moduleData.quizBank.length;
  const questionPct = Math.round(((state.quizIndex + 1) / totalQuestions) * 100);
  const hasAnswered = state.answeredQuestions.has(question.questionId);
  const isCorrect = state.correctAnswers.has(question.questionId);
  app.innerHTML = `<div class="page-wrap quiz-page"><p class="eyebrow">Quiz · ${moduleData.title} · Question ${state.quizIndex + 1}</p><h1>Check your understanding</h1>
    <section class="quiz-progress-block"><div class="progress-top"><h2>Question progress</h2><span class="progress-value">${state.quizIndex + 1} of ${totalQuestions} questions</span></div><div class="progress-track" role="progressbar" aria-label="Question progress" aria-valuenow="${state.quizIndex + 1}" aria-valuemin="0" aria-valuemax="${totalQuestions}"><div class="progress-fill" style="width:${questionPct}%"></div></div></section>
    <section class="quiz-card"><h2>${question.prompt}</h2>
    <div class="answer-list">${question.options.map((option, index) => {
      const correctOption = option === question.correctAnswer;
      const selected = state.selectedAnswer === index;
      let resultClass = '';
      if (hasAnswered && correctOption) resultClass = 'correct';
      else if (hasAnswered && selected && !correctOption) resultClass = 'incorrect';
      return `<button class="answer-option ${selected ? 'selected' : ''} ${resultClass}" type="button" data-answer="${index}" ${hasAnswered ? 'disabled' : ''}><span class="radio-mark" aria-hidden="true"></span><span>${option}</span></button>`;
    }).join('')}</div>
    ${hasAnswered ? `<div class="feedback ${isCorrect ? 'good' : 'try-again'}" role="status">${isCorrect ? question.feedback.correct : question.feedback.incorrect}</div>` : ''}
    <div class="quiz-actions"><button class="button" type="button" data-action="submit" ${state.selectedAnswer === null || hasAnswered ? 'disabled' : ''}>Submit answer</button>${hasAnswered ? `<button class="button" type="button" data-action="next">${state.quizIndex === moduleData.quizBank.length - 1 ? 'See results' : 'Next question'} →</button>` : ''}</div>
    </section></div>`;
  app.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => { state.selectedAnswer = Number(button.dataset.answer); renderQuiz(); }));
  const submit = app.querySelector('[data-action="submit"]');
  if (submit) submit.addEventListener('click', submitAnswer);
  const next = app.querySelector('[data-action="next"]');
  if (next) next.addEventListener('click', nextQuestion);
}

function submitAnswer() {
  const question = moduleData.quizBank[state.quizIndex];
  if (state.selectedAnswer === null) return;
  state.answeredQuestions.add(question.questionId);
  if (question.options[state.selectedAnswer] === question.correctAnswer) state.correctAnswers.add(question.questionId);
  render();
}

function nextQuestion() {
  if (state.quizIndex >= moduleData.quizBank.length - 1) {
    state.quizFinished = true;
  } else {
    state.quizIndex += 1;
    state.selectedAnswer = null;
  }
  render();
}

function renderQuizResults() {
  const score = state.correctAnswers.size;
  const total = moduleData.quizBank.length;
  app.innerHTML = `<div class="page-wrap"><div class="lesson-toolbar"><button class="back-link" type="button" data-action="lesson">← Back to lesson</button><span class="lesson-count">QUIZ COMPLETE · ${moduleData.title}</span></div><p class="eyebrow">Nice work</p><h1>You finished the knowledge check.</h1><section class="quiz-card"><p class="results-score">${score} / ${total}</p><h2>${score === total ? 'You got every question right.' : 'You’ve completed all the questions.'}</h2><p class="results-summary">${score === total ? 'You’re ready to use what you learned.' : 'You can revisit the lesson sections and review the setup steps whenever you need to.'} Your result is part of this browser session only.</p><div class="quiz-actions"><button class="button secondary" type="button" data-action="retry">Try quiz again</button><button class="button" type="button" data-action="lesson">Return to lesson</button></div></section></div>`;
  app.querySelectorAll('[data-action="lesson"]').forEach(button => button.addEventListener('click', () => showLesson()));
  app.querySelector('[data-action="retry"]').addEventListener('click', () => {
    state.quizIndex = 0; state.selectedAnswer = null; state.answeredQuestions.clear(); state.correctAnswers.clear(); state.quizFinished = false; state.view = 'quiz'; render();
  });
}

navButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.view === 'dashboard') showDashboard();
  if (button.dataset.view === 'lesson') showLesson();
  if (button.dataset.view === 'quiz') showQuiz();
}));
document.querySelector('.avatar').addEventListener('click', showProfile);
loadModules();
