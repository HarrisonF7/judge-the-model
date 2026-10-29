[Judge the Model – Public App](https://harrisonf7.github.io/judge-the-model/)

# Judge the Model

An app that helps a clinical lead judge whether any classifier is fit for each job: 30-day readmission and diabetes screening. It reads the results my Python analysis exported to `results/`.

**Central question:** Which classifier would you trust for this job, at what threshold, and with what limits?

Submit the link to **this repository** on Canvas, plus your five Canvas answers.

## Quick Start

Set up the Python environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the analysis and integrity checks:

```bash
python -m analysis
python check.py
```

Run the Node.js app locally:

```bash
bash run_app.sh
```

Then open [http://localhost:8766/](http://localhost:8766/) in your browser.

## What's Here

| **File** | **What it is** |
|---|---|
| `DECISIONS.md` | Your decisions: what matters for each job, your recommendations, and one design choice |
| `AGENT_BRIEF.md` | Rules for your AI coding agent |
| `SETUP.md` | How to run and publish the app |
| `analysis/` | The Python modeling workflow |
| `m11.py` | Shared metric helpers |
| `web/`, `package.json` | Node.js app, including `web/app.js` and `web/m11.js` |
| `run_app.sh` | Script to launch the Node.js app locally |
| `results/` | Results exported by the Python analysis |
| `data/` | Datasets, data dictionary, and manifest |
| `check.py` | Integrity checks |
| `prompts/` | Optional AI prompts, one file per session |