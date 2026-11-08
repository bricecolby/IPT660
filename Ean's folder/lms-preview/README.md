# Interview Ready LMS preview

This is a self-contained, browser-based course preview built from the draft learning module. It demonstrates the learner experience; it is not a deployed LMS and does not include accounts, grading, or instructor tools.

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
- Open the self-assessment checklist to score an answer against the supplied rubric and see its matching practice suggestion.
- Respond to the six reflection prompts and finish the practice module.

Typed answers and self-ratings exist only in the current page session. They are not transmitted or saved; refreshing the page clears them.
