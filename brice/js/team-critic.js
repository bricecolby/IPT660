/* Reviews a selected team through the reusable TypeChart. */
(function () {
  "use strict";

  class TeamCritic {
    constructor(typeChart) {
      this.typeChart = typeChart;
    }

    analyze(team) {
      const flags = [];
      const sharedWeaknesses = this.typeChart.types.map((attackingType) => ({
        attackingType,
        pokemon: team.filter((pokemon) => this.typeChart.getMultiplier(attackingType, pokemon.types) > 1)
      })).filter((entry) => entry.pokemon.length >= 3);

      sharedWeaknesses.forEach((entry) => {
        const names = entry.pokemon.map((pokemon) => pokemon.name).join(", ");
        flags.push({
          kind: "shared-weakness",
          title: `Shared ${entry.attackingType} weakness`,
          explanation: `${names} are weak to ${entry.attackingType}-type attacks.`
        });
      });

      const coverageGaps = this.typeChart.types.filter((defendingType) => {
        return !team.some((pokemon) => pokemon.types.some((attackingType) => {
          return this.typeChart.getMultiplier(attackingType, defendingType) > 1;
        }));
      });

      if (coverageGaps.length) {
        flags.push({
          kind: "coverage-gap",
          title: "Coverage gaps",
          explanation: `The team has no super-effective attack for: ${coverageGaps.join(", ")}.`
        });
      }

      return flags;
    }
  }

  window.TeamCritic = TeamCritic;
})();
