/* Displays one lesson section at a time and provides the quiz below the final section. */
(function () {
  "use strict";

  class LessonView {
    constructor(container, sections, quizViewFactory, tracker, onProgress) {
      this.container = container;
      this.sections = sections || [];
      this.quizViewFactory = quizViewFactory;
      this.tracker = tracker;
      this.onProgress = onProgress || function () {};
      this.index = 0;
      this.quizView = false;
      this.render();
    }

    render() {
      if (!this.sections.length) {
        this.container.innerHTML = `<div class="error-state"><h1>No lesson sections found</h1><p class="mb-0">Add a lesson JSON document with a <code>sections</code> array.</p></div>`;
        return;
      }

      const section = this.sections[this.index];
      this.tracker.startSection(section.sectionId);
      this.onProgress();

      this.container.innerHTML = `
        <div class="lesson-layout">
          <aside class="lesson-sidebar" aria-label="Lesson sections">
            <p class="eyebrow">Sections</p>
            <div class="section-list">
              ${this.sections.map((item, itemIndex) => this.sectionButton(item, itemIndex)).join("")}
              <button class="section-item quiz-item ${this.quizView ? "current" : ""}" type="button" data-action="quiz">
                <span class="section-number">Q</span><span class="section-name">Quiz</span><span class="section-status">After section ${this.sections.length}</span>
              </button>
            </div>
          </aside>
          <section>
            <article class="lesson-card" aria-labelledby="section-heading">
              <div class="lesson-heading-row">
                <p class="eyebrow">Section ${this.index + 1} of ${this.sections.length}</p>
                <span class="text-secondary small">${this.escape(section.sectionId)}</span>
              </div>
              <h1 id="section-heading">${this.escape(section.heading)}</h1>
              ${this.renderVisual(section)}
              <div class="lesson-body">${this.formatBody(section.body)}</div>
              <div class="lesson-actions">
                <button class="btn btn-outline-secondary btn-app" type="button" data-action="back" ${this.index === 0 ? "disabled" : ""}>Back</button>
                <button class="btn btn-app btn-app-primary" type="button" data-action="next">${this.index === this.sections.length - 1 ? "Review quiz" : "Next section"}</button>
              </div>
            </article>
            <div id="quiz-slot" class="mt-4"></div>
          </section>
        </div>`;

      this.container.querySelectorAll("[data-section-index]").forEach((button) => {
        button.addEventListener("click", () => this.goTo(Number(button.dataset.sectionIndex)));
      });
      this.container.querySelector("[data-action=back]").addEventListener("click", () => this.goTo(this.index - 1));
      this.container.querySelector("[data-action=next]").addEventListener("click", () => {
        if (this.index === this.sections.length - 1) this.showQuiz();
        else this.goTo(this.index + 1);
      });
      this.container.querySelector("[data-action=quiz]").addEventListener("click", () => this.showQuiz());

      if (this.quizView) this.renderQuiz();
    }

    sectionButton(section, itemIndex) {
      const isCurrent = itemIndex === this.index && !this.quizView;
      const viewed = this.tracker.getSnapshot().sectionsViewed.includes(section.sectionId);
      return `<button class="section-item ${isCurrent ? "current" : ""}" type="button" data-section-index="${itemIndex}">
        <span class="section-number">${itemIndex + 1}</span><span class="section-name">${this.escape(section.heading)}</span><span class="section-status">${isCurrent ? "Viewing" : viewed ? "Viewed" : ""}</span>
      </button>`;
    }

    goTo(index) {
      if (index < 0 || index >= this.sections.length) return;
      this.index = index;
      this.quizView = false;
      this.render();
    }

    showQuiz() {
      this.index = this.sections.length - 1;
      this.quizView = true;
      this.render();
    }

    renderQuiz() {
      const slot = this.container.querySelector("#quiz-slot");
      if (slot && this.quizView) this.quizViewFactory(slot);
    }

    renderVisual(section) {
      if (section.image) {
        return `<div class="lesson-visual lesson-visual-image"><img src="${this.escape(section.image)}" alt="${this.escape(section.heading)}" loading="lazy"></div>`;
      }
      return "";
    }

    formatBody(body) {
      const paragraphs = String(body || "").split(/\n\s*\n/);
      return paragraphs.map((paragraph) => `<p>${this.formatInline(paragraph.trim())}</p>`).join("");
    }

    formatInline(value) {
      return this.escape(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    }

    escape(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    }
  }

  window.LessonView = LessonView;
})();
