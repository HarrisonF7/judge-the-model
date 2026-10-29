 [Judge the Model – Public App](https://harrisonf7.github.io/judge-the-model/)

# Judge the Model

An app that helps a clinical lead judge whether any classifier is fit for each job: 30-day readmission and diabetes screening. It reads the results my Python analysis exported to `results/`.

**Central question:** Which classifier would you trust for this job, at what threshold, and with what limits?

Submit the link to **this repository** on Canvas, plus your five Canvas answers.

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python check.py --stage setup
```

| **Step** | **Command** | **Before you run it** |
|---|---|---|
| 2 | — | Fill in `Before results` in `DECISIONS.md`; commit and push |
| 3 | `python -m analysis` | Complete the kNN TODO in `analysis/models.py` |
| 5 | `python -m analysis` (again) | Fill in `Recommendations` and `Design choice and AI use` in `DECISIONS.md` |
| Any | `python check.py` | — |

Run the app locally:

```bash
bash run_app.sh
```

## What's Here

| **File** | **What it is** |
|---|---|
| `DECISIONS.md` | Your decisions: what matters for each job, your recommendations, and one design choice |
| `AGENT_BRIEF.md` | Rules for your AI coding agent |
| `SETUP.md` | How to run and publish the app |
| `analysis/` | The modeling workflow |
| `m11.py` | Shared metric helpers |
| `streamlit_app.py`, `requirements.txt` | Streamlit version of the app |
| `web/`, `package.json` | Node.js app, including `web/app.js` and `web/m11.js` |
| `run_app.sh` | Script to launch the Node.js app locally |
| `results/` | Results exported by the Python analysis |
| `data/` | Datasets, data dictionary, and manifest |
| `check.py` | Integrity checks |
| `prompts/` | Optional AI prompts, one file per session |