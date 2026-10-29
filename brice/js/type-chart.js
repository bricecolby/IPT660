/* Reusable type-effectiveness logic and its small Team-tab interface. */
(function () {
  "use strict";

  class TypeChart {
    constructor(data) {
      this.types = data.types || [];
      this.effectiveness = data.effectiveness || {};
    }

    getMultiplier(attackingType, defendingTypes) {
      const defenders = Array.isArray(defendingTypes) ? defendingTypes : [defendingTypes];
      return defenders.reduce((multiplier, defendingType) => {
        const attackingRow = this.effectiveness[attackingType] || {};
        return multiplier * (attackingRow[defendingType] === undefined ? 1 : attackingRow[defendingType]);
      }, 1);
    }

    describe(attackingType, defendingType) {
      const multiplier = this.getMultiplier(attackingType, defendingType);
      if (multiplier > 1) return { label: "Super effective", className: "matchup-super", multiplier };
      if (multiplier < 1) return { label: "Not very effective", className: "matchup-not-very", multiplier };
      return { label: "Neutral", className: "matchup-neutral", multiplier };
    }

    render(container) {
      container.innerHTML = `
        <section class="type-chart-card card shadow-sm" aria-labelledby="type-chart-heading">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <p class="eyebrow mb-1">Type Chart</p>
                <h2 id="type-chart-heading" class="h4 mb-1">Check a matchup</h2>
                <p class="text-secondary mb-0">See how an attacking type performs against a defending type.</p>
              </div>
              <span class="type-chart-mark" aria-hidden="true">✦</span>
            </div>
            <div class="row g-3 mt-2">
              <div class="col-sm-6">
                <label class="form-label" for="attacking-type">Attacking type</label>
                <select id="attacking-type" class="form-select" data-type-chart="attacking">${this.options()}</select>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="defending-type">Defending type</label>
                <select id="defending-type" class="form-select" data-type-chart="defending">${this.options()}</select>
              </div>
            </div>
            <div id="matchup-result" class="matchup-result matchup-neutral mt-3" role="status" aria-live="polite"></div>
          </div>
        </section>`;

      const update = () => {
        const attacking = container.querySelector("[data-type-chart=attacking]").value;
        const defending = container.querySelector("[data-type-chart=defending]").value;
        const result = this.describe(attacking, defending);
        const resultElement = container.querySelector("#matchup-result");
        resultElement.className = `matchup-result ${result.className} mt-3`;
        resultElement.innerHTML = `<strong>${this.escape(result.label)}</strong><span>${this.formatMultiplier(result.multiplier)} damage</span>`;
      };

      container.querySelectorAll("select[data-type-chart]").forEach((select) => select.addEventListener("change", update));
      update();
    }

    options() {
      return this.types.map((type) => `<option value="${this.escape(type)}">${this.escape(type)}</option>`).join("");
    }

    formatMultiplier(multiplier) {
      if (multiplier === 0) return "0×";
      return `${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(2)}×`;
    }

    escape(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    }
  }

  window.TypeChart = TypeChart;
})();
