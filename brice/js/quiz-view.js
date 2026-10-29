/* Renders quiz questions and delegates answer decisions to QuizEngine. */
(function () {
  "use strict";

  class QuizView {
    constructor(container, engine, onChange) {
      this.container = container;
      this.engine = engine;
      this.onChange = onChange || function () {};
      this.feedback = null;
      this.selectedAnswer = "";
      this.render();
    }

    render() {
      if (this.engine.isComplete) {
        this.renderComplete();
        return;
      }

      const question = this.engine.currentQuestion;
      const questionNumber = this.engine.index + 1;
      const feedback = this.feedback ? `
        <div class="alert feedback-alert ${this.feedback.correct ? "feedback-correct" : "feedback-incorrect"}" role="alert">
          <div class="eyebrow mb-1">Feedback alert</div>
          ${this.escape(this.feedback.feedback)}
        </div>` : "";

      this.container.innerHTML = `
        <div class="quiz-breadcrumb">Learn <span aria-hidden="true">›</span> Quiz</div>
        <article class="quiz-card">
          <div class="quiz-topline">
            <p class="eyebrow mb-0">Question ${questionNumber} of ${this.engine.questions.length}</p>
            <span class="score-line">Score: ${this.engine.score} of ${this.engine.questions.length}</span>
          </div>
          <h2>${this.escape(question.prompt)}</h2>
          <div class="answer-list" role="radiogroup" aria-label="Answer choices">
            ${question.options.map((option, index) => `
              <label class="answer-option" for="answer-${index}">
                <input id="answer-${index}" type="radio" name="quiz-answer" value="${this.escapeAttribute(option)}" ${this.selectedAnswer === option ? "checked" : ""}>
                <span>${this.escape(option)}</span>
              </label>`).join("")}
          </div>
          ${feedback}
          <div class="quiz-actions">
            <button class="btn btn-outline-secondary btn-app" type="button" data-action="check">Check answer</button>
            <button class="btn btn-app btn-app-primary" type="button" data-action="next" ${this.feedback ? "" : "disabled"}>${questionNumber === this.engine.questions.length ? "Finish quiz" : "Next question"}</button>
          </div>
        </article>`;

      this.container.querySelectorAll("input[name=quiz-answer]").forEach((input) => {
        input.addEventListener("change", () => { this.selectedAnswer = input.value; });
      });
      this.container.querySelector("[data-action=check]").addEventListener("click", () => this.checkAnswer());
      this.container.querySelector("[data-action=next]").addEventListener("click", () => this.next());
    }

    checkAnswer() {
      const selected = this.container.querySelector("input[name=quiz-answer]:checked");
      if (!selected) {
        this.feedback = { correct: false, feedback: "Choose an answer before checking." };
      } else {
        this.selectedAnswer = selected.value;
        this.feedback = this.engine.submit(selected.value);
      }
      this.render();
      this.onChange();
    }

    next() {
      this.engine.next();
      this.feedback = null;
      this.selectedAnswer = "";
      this.render();
      this.onChange();
    }

    renderComplete() {
      this.container.innerHTML = `
        <div class="quiz-breadcrumb">Learn <span aria-hidden="true">›</span> Quiz</div>
        <article class="quiz-complete-card">
          <p class="eyebrow">Quiz complete</p>
          <h2>Nice work, Trainer.</h2>
          <div class="score-large">${this.engine.score} / ${this.engine.questions.length}</div>
          <p class="text-secondary">Your answers are recorded in this in-memory session.</p>
          <button class="btn btn-app btn-app-primary" type="button" data-action="restart">Try again</button>
        </article>`;
      this.container.querySelector("[data-action=restart]").addEventListener("click", () => {
        this.engine.reset();
        this.feedback = null;
        this.selectedAnswer = "";
        this.render();
        this.onChange();
      });
    }

    escape(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    }

    escapeAttribute(value) { return this.escape(value); }
  }

  window.QuizView = QuizView;
})();
