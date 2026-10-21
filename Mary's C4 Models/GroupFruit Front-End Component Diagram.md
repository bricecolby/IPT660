# GroupFruit Front-End Component Diagram

This draft shows the parts of the learner-facing course interface and how they fit together. It covers the browser experience and its bundled course content. It does not model a server or backend.

```mermaid
flowchart LR
    learner[Elementary school teacher<br/>using a web browser]

    subgraph app[GroupFruit course interface in the browser]
        shell[Shared course shell<br/>Header, page navigation, layout]
        home[Home page<br/>Hero and page links]
        progress[Visited-role tracker<br/>Browser-side state]
        roleTemplate[Role page template<br/>Image, role points, explanation, quiz]
        rolePages[Five role pages<br/>Facilitator, Recorder, Unifier,<br/>Inventor, Tester]
        deepTemplate[Deep-dive page template<br/>Image, content, quiz]
        deepPages[Deep-dive pages<br/>Overview, Safety, Workload, Caveat]
        quiz[Quiz interaction<br/>Answer selection, correctness,<br/>feedback]
        assignment[Assignment prompt<br/>Placement and interaction to be designed]
    end

    subgraph package[Course content packaged with the interface]
        json[GroupFruit.course.json<br/>Sections, quiz questions and answers,<br/>assignment instructions]
        copy[Page-specific content<br/>Current source: content for specific pages.docx]
        images[Images and role artwork<br/>Bundled image files]
        style[Style guide<br/>Colors and role themes]
    end

    video[YouTube video<br/>Embedded on the Safety page]

    learner -->|opens and navigates| shell
    shell --> home
    shell --> roleTemplate
    shell --> deepTemplate
    home -->|links to| rolePages
    rolePages --> roleTemplate
    roleTemplate --> quiz
    roleTemplate -->|records visited roles| progress
    progress -->|unlocks deeper-page links<br/>after all five roles| home
    home -->|links when unlocked| deepPages
    deepPages --> deepTemplate
    deepTemplate --> quiz
    deepPages -.->|Safety page embeds| video
    json -.->|could supply assignment content| assignment

    json -->|supplies lesson and quiz data| roleTemplate
    json -->|supplies quiz data| deepTemplate
    json -->|supplies answers and feedback| quiz
    copy -->|supplies detailed page copy| roleTemplate
    copy -->|supplies deep-dive copy| deepTemplate
    images -->|supplies page and role images| roleTemplate
    images -->|supplies page images| deepTemplate
    style -->|guides colors and visual styling| shell
```

## How to read this draft

- The boxes inside **GroupFruit course interface in the browser** are front-end components or page templates. The five role pages share one template; the four deeper pages share another.
- The **Course content packaged with the interface** group contains files the interface displays. It is not a database or a backend service.
- The visited-role tracker represents the wireframe note that deeper-page links become available after all five role pages have been visited. This draft assumes that progress is held in the browser. The wireframes do not say whether it should survive closing the browser.
- The quiz interaction represents selecting an answer and showing the matching feedback from the course content. No results are sent to a server in this scope.
- The assignment instructions are present in the JSON, but the current wireframes do not show where or how learners will use them. Add an assignment page or section only after deciding that screen.
- The Safety page's YouTube video is an external media dependency, not a backend we are building.

## Scope questions to settle

1. Should the five-role visit tracker reset when the browser closes, or should the design avoid an unlock gate?
2. Should the assignment appear as a page, a section on an existing page, or remain only in the course content package?
3. Will the Safety video be embedded, linked, or omitted in the final interface?

## Improving the existing C4 diagrams

- **Context diagram:** give the central system a name and a one-sentence purpose. Keep only people and external systems that interact with the course. “Mary” is the project author, not a learner or runtime system actor. The OER publisher and push notifications should appear only if the course actually exchanges information with them. The current diagram has no labeled relationship details.
- **Container diagram:** for a front-end-only project, show the browser-based course interface as the main runnable part and the packaged JSON and images as content it reads. Leave out analytics, temporary storage, AI search, and feedback systems unless those are real, in-scope integrations. Label each relationship with what moves across it.
- **Keep diagram levels distinct:** the context diagram answers who uses the course and what it connects to; the container diagram answers what deployable parts it has; this component diagram answers how the interface is divided into reusable pages and UI pieces.
