/* Application shell: loads content, switches tabs, and wires Learn and Team together. */
(function () {
  "use strict";

  const app = document.querySelector("#app");
  const progressLabel = document.querySelector("#progress-label");
  const progressBar = document.querySelector("#progress-bar");
  let sections = [];
  let questions = [];
  let pokemon = [];
  let typeChart;
  let lessonView;
  let quizEngine;
  let teamBuilder;
  let teamCritic;
  let teamSelection = [];
  let teamFlags = [];

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });

  function switchTab(tabName) {
    if (tabName === "battle" && !isBattleUnlocked()) {
      switchTab("team");
      if (teamBuilder) teamBuilder.setNotice("Choose six Pokémon to unlock Battle.");
      return;
    }

    setActiveTab(tabName);
    if (tabName === "learn") {
      if (!lessonView) createLearnView();
      else lessonView.render();
      return;
    }

    if (tabName === "team") {
      SessionTracker.stopSection();
      renderTeamView();
      return;
    }

    SessionTracker.stopSection();
    renderPlaceholder(tabName);
  }

  function setActiveTab(tabName) {
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      const selected = tab.dataset.tab === tabName;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
  }

  function createLearnView() {
    quizEngine = new QuizEngine(questions, SessionTracker);
    lessonView = new LessonView(app, sections, createQuizView, SessionTracker, updateProgress);
  }

  function createQuizView(slot) {
    return new QuizView(slot, quizEngine, updateProgress);
  }

  function renderTeamView() {
    if (!typeChart || !pokemon.length) {
      app.innerHTML = `<div class="error-state alert alert-danger" role="alert"><h1 class="h3">Team data could not be loaded</h1><p class="mb-0">The Team tab needs Pokémon data in <code>data/pokemon-master.json</code> and type data in <code>data/pokemon-types.json</code>.</p></div>`;
      return;
    }

    app.innerHTML = `<div class="team-tab-container"><div id="type-chart-container"></div><div id="team-builder-container" class="mt-4"></div></div>`;
    typeChart.render(document.querySelector("#type-chart-container"));

    const teamContainer = document.querySelector("#team-builder-container");
    if (!teamBuilder) {
      teamCritic = new TeamCritic(typeChart);
      teamBuilder = new TeamBuilder(teamContainer, pokemon, handleTeamChange);
    } else {
      teamBuilder.setContainer(teamContainer);
      teamBuilder.setFlags(teamFlags);
    }
  }

  function handleTeamChange(selection) {
    teamSelection = selection;
    teamFlags = teamCritic.analyze(teamSelection);
    SessionTracker.logTeamChange(teamSelection, teamFlags);
    teamBuilder.setFlags(teamFlags);
    updateBattleTab();
  }

  function updateBattleTab() {
    const battleTab = document.querySelector("[data-tab=battle]");
    const unlocked = isBattleUnlocked();
    battleTab.classList.toggle("nav-tab-locked", !unlocked);
    battleTab.setAttribute("aria-disabled", String(!unlocked));
    battleTab.title = unlocked ? "Battle unlocked" : "Choose six Pokémon to unlock Battle";
  }

  function isBattleUnlocked() { return teamSelection.length === 6; }

  function renderPlaceholder(tabName) {
    app.innerHTML = `<section class="placeholder-card"><p class="eyebrow">${capitalize(tabName)}</p><h1>Coming soon</h1><p>This part of Pokémon Mastery is still in training.</p></section>`;
  }

  function updateProgress() {
    const viewed = SessionTracker.getSnapshot().sectionsViewed.length;
    const total = sections.length;
    const percent = total ? Math.round((viewed / total) * 100) : 0;
    progressLabel.textContent = `${viewed} of ${total} sections`;
    progressBar.style.width = `${percent}%`;
    const track = progressBar.parentElement;
    track.setAttribute("aria-valuemax", String(total));
    track.setAttribute("aria-valuenow", String(viewed));
  }

  function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }

  updateBattleTab();
  ContentLoader.load().then((payload) => {
    sections = ContentLoader.getSections(payload);
    questions = ContentLoader.getQuestions(payload);
    pokemon = ContentLoader.getPokemon(payload);
    typeChart = new TypeChart(ContentLoader.getTypeChart(payload));
    updateProgress();
    createLearnView();
  }).catch((error) => {
    app.innerHTML = `<div class="error-state alert alert-danger" role="alert"><h1 class="h3">Content could not be loaded</h1><p>${escapeHtml(error.message)}</p><p class="mb-0">Run the site through a local web server and confirm that the JSON files are in <code>data/</code>.</p></div>`;
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  }
})();
