[Judge the Model – Public App](https://harrisonf7.github.io/judge-the-model/)

# Judge the Model

An app that helps a clinical lead judge whether any classifier is fit for each job: 30-day readmission and diabetes screening. It reads the results my Python analysis exported to `results/`.

**Central question:** Which classifier would you trust for this job, at what threshold, and with what limits?

Submit the link to **this repository** on Canvas, plus your five Canvas answers.

## Run locally

Python 3.11+ and Node.js 20+ are required. The Node app is the completed app; `streamlit_app.py` is the unused starter.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m analysis
bash run_app.sh
```

Open <http://localhost:8766/>. The app reads only exported `results/` JSON; it never retrains models. All preprocessing and model fitting use the supplied training rows only.

## Verify

```bash
source .venv/bin/activate
python check.py --stage results
npm test
python check.py
```

The tests compare Python and JavaScript calculations for every model and partition, exercise all 40 section/dataset/model combinations, check live threshold updates, and cover missing results and delayed responses. Set `PYTHON=/path/to/python` for `npm test` if the environment is not `.venv`.

The full integrity check additionally requires the regenerated results to be committed. Review and commit the app, tests, documentation, and `results/`, then push and rerun the full check.

## App contents

1. Beyond Accuracy: positive classes, prevalence, majority accuracy, five confusion matrices, and accuracy, sensitivity, specificity, FPR, precision and F1 at 0.50.
2. A Threshold for the Job: persistent slider, comparison with 0.50, confusion matrices, follow-up workload, false alarms per 100, and the diabetes sensitivity target.
3. Ranking vs. Being Right: all-model ROC and AUROC comparisons, selected-model calibration plot and group table.
4. Training vs. Test: all-model AUROC gaps, patient counts, and selected-model classification metrics on both partitions.

Recommendations are exported from the student's unchanged `DECISIONS.md`. Test-guided threshold choices require further validation; these results do not establish clinical readiness.

## Publish with GitHub Pages

In repository **Settings → Pages**, use **Deploy from a branch**, branch `main`, folder `/ (root)`. Commit `index.html`, `.nojekyll`, `web/`, and `results/`. All assets and JSON fetches use relative paths, so the app works under the repository's Pages subpath without npm installation or a backend.

After pushing, open the public app in a private window, switch both datasets and every section, and check the threshold slider. Submission decisions and Canvas responses remain the student's own work.

The [current public assignment](https://snsie.github.io/classification-activity/) describes three sections; this repository retains the four sections requested by its supplied `AGENT_BRIEF.md`, including Ranking vs. Being Right, and incorporates the current comparison minimums.
