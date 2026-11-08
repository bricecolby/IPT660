# Interview Preparation eLearning Module — C4 Diagrams

These are working diagrams based on the draft module and the initial C4 sketch. The repository contains learning content in JSON, but does not define a deployed website, LMS, identity provider, analytics service, database, or email integration. Technical details marked **TBD** need confirmation before these diagrams describe an implementation.

## System context

The system is the learning module itself. Students are the primary users. Advisors and course administrators appear in the initial sketch; their roles below are provisional because the content files do not specify advisor workflows or an administration interface. The campus offices are shown as people/organizations learners may consult, not as connected software systems.

```mermaid
flowchart LR
  student["Person: International college student<br/>Uses lessons, mock interview practice,<br/>self-assessment, and reflection"]
  advisor["Person: Career advisor / instructor<br/>May direct or support a student using<br/>the module — workflow TBD"]
  admin["Person: Course administrator / content maintainer<br/>May prepare or update module content;<br/>no admin interface is specified"]

  subgraph boundary["Software system: Job Interview Preparation eLearning Module"]
    module["Interview preparation learning experience<br/>Interview guidance, practice scenarios,<br/>self-assessment rubric, reflection"]
  end

  host["External software system: LMS / website host<br/>TBD — delivery platform not identified"]
  offices["External people / organizations: Campus career services<br/>and international student office<br/>Learners can consult them for career or work-authorization guidance"]

  student -->|Studies and completes activities| module
  advisor -.->|Refers or supports learner; confirm workflow| module
  admin -.->|Maintains source learning content; confirm workflow| module
  host -.->|May host or launch the module; integration TBD| module
  student -.->|Seeks individual career or immigration guidance| offices

  classDef person fill:#08427b,color:#fff,stroke:#052e56,stroke-width:1px;
  classDef system fill:#1168bd,color:#fff,stroke:#0b4884,stroke-width:2px;
  classDef external fill:#999,color:#fff,stroke:#666,stroke-width:1px;
  class student,advisor,admin,offices person;
  class module system;
  class host external;
```

## Container view — conceptual deployment

Only one runtime container is justified by the current materials: a browser-based learning experience. The content JSON is shown inside that container as bundled content rather than as a separate service or database. The delivery platform and implementation technology remain **TBD**. No response storage, learner account system, analytics, or external communication service is shown because the project files do not define them.

```mermaid
flowchart LR
  student["Person: International college student"]

  subgraph boundary["Software system: Job Interview Preparation eLearning Module"]
    web["Container: Browser-based learning module<br/>Technology TBD<br/><br/>Pages: Home, Preparation, Question Basics,<br/>Professional Communication, Mock Interview, Reflection"]
    content["Bundled content files<br/>module.json<br/>mock_interview_activity.json<br/>feedback_rubric.json<br/>reflection_activity.json"]
    web -.->|Loads lesson and activity content| content
  end

  host["External system: LMS / static web host<br/>TBD — serves or launches the module"]

  student -->|HTTPS in a web browser; delivery details TBD| web
  host -.->|Hosts / serves module; deployment TBD| web

  classDef person fill:#08427b,color:#fff,stroke:#052e56,stroke-width:1px;
  classDef container fill:#438dd5,color:#fff,stroke:#1d5d99,stroke-width:2px;
  classDef data fill:#85bbf0,color:#111,stroke:#1d5d99,stroke-width:1px;
  classDef external fill:#999,color:#fff,stroke:#666,stroke-width:1px;
  class student person;
  class web container;
  class content data;
  class host external;
```

## Decisions to confirm

- What will deliver the module: an existing LMS, an institutional website, or another platform?
- Are advisors and administrators actual users of the system, or should they remain outside the system as support roles?
- Should mock interview and reflection responses be saved between visits? The current draft does not define persistence.
- Is sign-in required, and if so, is it provided by the host platform?
- Does the project need any email, analytics, or dashboard integration? These appear in the sketch but are not present in the module requirements; AI-generated feedback is explicitly out of scope.

Until these are answered, treat the context and container diagrams as a scope-aligned concept, not a record of the implemented architecture.
