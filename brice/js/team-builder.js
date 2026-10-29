/* Team selection UI: roster on the left, selected team and critique on the right. */
(function () {
  "use strict";

  class TeamBuilder {
    constructor(container, pokemon, onChange) {
      this.container = container;
      this.pokemon = pokemon || [];
      this.onChange = onChange || function () {};
      this.selected = [];
      this.flags = [];
      this.notice = "";
      this.render();
    }

    setContainer(container) {
      this.container = container;
      this.render();
    }

    setFlags(flags) {
      this.flags = flags || [];
      this.render();
    }

    setNotice(notice) {
      this.notice = notice || "";
      this.render();
    }

    render() {
      this.container.innerHTML = `
        <div class="team-shell">
          <div class="team-heading-row">
            <div>
              <p class="eyebrow mb-1">Team Builder</p>
              <h1>Build your party</h1>
              <p class="team-intro">Choose up to six Pokémon, then check what your team handles well.</p>
            </div>
            <div class="team-count"><span>${this.selected.length}</span><small>/ 6 chosen</small></div>
          </div>
          ${this.notice ? `<div class="alert alert-info" role="status">${this.escape(this.notice)}</div>` : ""}
          <div class="team-workspace">
            <section class="roster-panel" aria-labelledby="roster-heading">
              <div class="panel-heading"><h2 id="roster-heading">Pokémon roster</h2><span>${this.pokemon.length} available</span></div>
              <div class="pokemon-roster">${this.pokemon.map((pokemon, index) => this.rosterCard(pokemon, index)).join("")}</div>
            </section>
            <section class="team-panel" aria-labelledby="team-heading">
              <div class="panel-heading"><h2 id="team-heading">Your team</h2><span>6 slots</span></div>
              <div class="selected-team">${this.selected.length ? this.selected.map((pokemon, index) => this.teamCard(pokemon, index)).join("") : `<div class="team-empty"><span class="pokeball-mark">◓</span><p>Your team is empty.</p><small>Select Pokémon from the roster to get started.</small></div>`}</div>
              ${this.renderFlags()}
            </section>
          </div>
        </div>`;

      this.container.querySelectorAll("[data-add-index]").forEach((button) => button.addEventListener("click", () => this.add(Number(button.dataset.addIndex))));
      this.container.querySelectorAll("[data-remove-index]").forEach((button) => button.addEventListener("click", () => this.remove(Number(button.dataset.removeIndex))));
    }

    rosterCard(pokemon, index) {
      const isSelected = this.selected.some((selected) => selected.name === pokemon.name);
      const isFull = this.selected.length >= 6;
      return `<article class="card pokemon-card roster-card ${isSelected ? "pokemon-selected" : ""}">
        <div class="card-body">
          <div class="pokemon-sprite" aria-hidden="true">${this.initials(pokemon.name)}</div>
          <div class="pokemon-card-copy"><h3>${this.escape(pokemon.name)}</h3><div class="type-pills">${this.typePills(pokemon.types)}</div></div>
          <button class="btn btn-sm ${isSelected ? "btn-secondary" : "btn-outline-primary"}" type="button" data-add-index="${index}" ${isSelected || isFull ? "disabled" : ""}>${isSelected ? "Chosen" : "Add"}</button>
        </div>
      </article>`;
    }

    teamCard(pokemon, index) {
      return `<article class="card pokemon-card team-card">
        <div class="card-body"><div class="pokemon-sprite" aria-hidden="true">${this.initials(pokemon.name)}</div><div class="pokemon-card-copy"><h3>${this.escape(pokemon.name)}</h3><div class="type-pills">${this.typePills(pokemon.types)}</div></div><button class="btn btn-sm btn-outline-danger" type="button" data-remove-index="${index}">Remove</button></div>
      </article>`;
    }

    renderFlags() {
      if (!this.selected.length) return "";
      if (!this.flags.length) return `<div class="alert alert-success team-critique" role="status"><strong>Team Critic:</strong> No shared weakness or coverage gap flagged yet.</div>`;
      return `<div class="team-critique"><p class="eyebrow mb-2">Team Critic</p>${this.flags.map((flag) => `<div class="alert alert-warning critique-flag" role="alert"><strong>${this.escape(flag.title)}:</strong> ${this.escape(flag.explanation)}</div>`).join("")}</div>`;
    }

    add(index) {
      if (this.selected.length >= 6 || this.selected.some((pokemon) => pokemon.name === this.pokemon[index].name)) return;
      this.selected.push(this.pokemon[index]);
      this.commit();
    }

    remove(index) {
      this.selected.splice(index, 1);
      this.commit();
    }

    commit() {
      this.notice = "";
      this.render();
      this.onChange([...this.selected]);
    }

    typePills(types) {
      return types.map((type) => `<span class="type-pill type-${type.toLowerCase()}">${this.escape(type)}</span>`).join("");
    }

    initials(name) { return String(name).slice(0, 2).toUpperCase(); }

    escape(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    }
  }

  window.TeamBuilder = TeamBuilder;
})();
