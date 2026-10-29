/* In-memory session state. It is intentionally not persisted after the tab closes. */
(function () {
  "use strict";

  const state = {
    startedAt: Date.now(),
    sectionsViewed: [],
    sectionTime: {},
    quizAnswers: [],
    teamChanges: [],
    activeSectionId: null,
    activeSectionStartedAt: null
  };

  function startSection(sectionId) {
    if (state.activeSectionId === sectionId) return;
    stopSection();
    state.activeSectionId = sectionId;
    state.activeSectionStartedAt = performance.now();
    if (!state.sectionsViewed.includes(sectionId)) state.sectionsViewed.push(sectionId);
  }

  function stopSection() {
    if (!state.activeSectionId || state.activeSectionStartedAt === null) return;
    const elapsedSeconds = (performance.now() - state.activeSectionStartedAt) / 1000;
    state.sectionTime[state.activeSectionId] = (state.sectionTime[state.activeSectionId] || 0) + elapsedSeconds;
    state.activeSectionId = null;
    state.activeSectionStartedAt = null;
  }

  function logQuizAnswer(result) {
    state.quizAnswers.push({
      questionId: result.questionId,
      answer: result.answer,
      correct: result.correct,
      attempts: result.attempts,
      answeredAt: Date.now()
    });
  }

  function logTeamChange(team, flags) {
    state.teamChanges.push({
      team: (team || []).map((pokemon) => ({ name: pokemon.name, types: [...pokemon.types] })),
      flags: (flags || []).map((flag) => ({ ...flag })),
      changedAt: Date.now()
    });
  }

  function getSnapshot() {
    return {
      ...state,
      sectionTime: { ...state.sectionTime },
      sectionsViewed: [...state.sectionsViewed],
      quizAnswers: state.quizAnswers.map((answer) => ({ ...answer }))
    };
  }

  window.SessionTracker = { startSection, stopSection, logQuizAnswer, logTeamChange, getSnapshot };
})();
