/* Loads each content source once and exposes the result to the other components. */
(function () {
  "use strict";

  const sources = ["data/pokemon-master.json", "data/pokemon-types.json"];
  let contentPromise;

  function load() {
    if (!contentPromise) {
      contentPromise = Promise.all(sources.map((source) =>
        fetch(`${source}?cacheBust=${Date.now()}`, { cache: "no-store" }).then((response) => {
          if (!response.ok) {
            throw new Error(`Could not load ${source} (${response.status}).`);
          }
          return response.json();
        })
      )).then((documents) => ({ documents, sources }));
    }
    return contentPromise;
  }

  function isLessonDocument(document) {
    return document && Array.isArray(document.sections) && Array.isArray(document.quizBank);
  }

  function getLessonDocuments(payload) {
    return payload.documents.filter(isLessonDocument);
  }

  function getSections(payload) {
    const primaryDocument = getLessonDocuments(payload)[0];
    return primaryDocument ? primaryDocument.sections : [];
  }

  function getQuestions(payload) {
    const primaryDocument = getLessonDocuments(payload)[0];
    return primaryDocument ? primaryDocument.quizBank : [];
  }

  function getPokemon(payload) {
    const primaryDocument = getLessonDocuments(payload)[0];
    return primaryDocument && Array.isArray(primaryDocument.pokemon) ? primaryDocument.pokemon : [];
  }

  function getTypeChart(payload) {
    return payload.documents.find((document) => Array.isArray(document.types) && document.effectiveness) || { types: [], effectiveness: {} };
  }

  window.ContentLoader = { load, getLessonDocuments, getSections, getQuestions, getPokemon, getTypeChart };
})();
