# Interview Ready LMS preview

This is a self-contained, browser-based course preview built from the draft learning module. It demonstrates the learner experience; it is not a deployed LMS and does not include accounts, formal grading, or instructor tools.

## Preview it

1. Open `index.html` in Visual Studio.
2. Use **View in Browser** if Visual Studio offers that option, or open the file from File Explorer in your browser.

The preview works as a local file and does not require a server or network connection.

## Refresh after changing the source content

The preview bundles the four JSON source files into `content.js`. If you edit those source files, open the Visual Studio terminal in this folder and run:

```powershell
./build-content.ps1
```

If PowerShell blocks the script, run it from a PowerShell terminal opened in this folder with:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-content.ps1
```

Then reopen or refresh `index.html` in the browser.

## Learner activities

- Navigate the six course pages from the left menu.
- Type practice answers for five mock interview questions.
- Choose a work-authorization or sponsorship conversation topic without disclosing a specific visa category.
- Open the self-assessment checklist to rate an answer against the supplied rubric and receive local practice hints based on the rubric and simple text cues.
- Respond to the six reflection prompts and finish the practice module.
- Open **Session Dashboard** to view lesson and resource completion, per-question attempts, activities completed, page visits, response revisions, feedback views, and time spent.

Progress, metrics, topic choices, typed answers, and self-ratings exist only in page memory for the current session. They are not transmitted or saved; refreshing the page clears them. Feedback is a transparent practice aid, not AI grading, legal advice, or an evaluation of immigration eligibility.
