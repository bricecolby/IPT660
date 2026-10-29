/* Owns question state, answer checking, scoring, and quiz logging. */
(function () {
  "use strict";

  class QuizEngine {
    constructor(questions, tracker) {
      this.questions = questions || [];
      this.tracker = tracker;
      this.index = 0;
      this.score = 0;
      this.attempts = {};
      this.results = {};
    }

    get currentQuestion() { return this.questions[this.index] || null; }
    get isComplete() { return this.index >= this.questions.length; }

    submit(answer) {
      const question = this.currentQuestion;
      if (!question || !answer) return { error: "Choose an answer before checking." };

      const questionId = question.questionId;
      const attempts = (this.attempts[questionId] || 0) + 1;
      const correct = this.answersMatch(answer, question.correctAnswer);
      const alreadyCorrect = this.results[questionId] === true;
      this.attempts[questionId] = attempts;
      if (correct && !alreadyCorrect) this.score += 1;
      if (correct) this.results[questionId] = true;

      this.tracker.logQuizAnswer({ questionId, answer, correct, attempts });
      const feedback = question.feedback || {};
      return {
        questionId,
        answer,
        correct,
        attempts,
        score: this.score,
        feedback: correct ? (feedback.correct || feedback.correctFeedback || "Correct.") : (feedback.incorrect || feedback.incorrectFeedback || "Not quite. Try again.")
      };
    }

    answersMatch(answer, correctAnswer) {
      if (answer === correctAnswer) return true;
      return String(answer).trim().replace(/[.!?]+$/, "") === String(correctAnswer).trim().replace(/[.!?]+$/, "");
    }

    next() {
      if (!this.isComplete) this.index += 1;
      return this.currentQuestion;
    }

    reset() {
      this.index = 0;
      this.score = 0;
      this.attempts = {};
      this.results = {};
    }
  }

  window.QuizEngine = QuizEngine;
})();
