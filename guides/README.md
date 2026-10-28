# Lab 04 guide

[Download the Greek step-by-step guide](student-guide.pdf).

The 11-page PDF follows the DevByMidnight / Minecraft Tech Labs navy-and-mint branding. It includes setup, configuration, an adult/instructor API-key tutorial, Minecraft commands, experiments, troubleshooting and a teacher checklist. Illustrations are labelled as artwork, not gameplay screenshots.

For maintainers only, rebuild from the repository root with Python and ReportLab installed:

```text
python scripts/build-guide.py
```

The generator uses existing Windows Arial/Consolas fonts or Linux DejaVu fonts. Students do not need Python, ReportLab or any PDF build tools. After a content change, render the PDF pages and inspect them before publishing. See `docs/assets/README.md` for the artwork source.
