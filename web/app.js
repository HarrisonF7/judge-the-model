
// Starter Node app: four sections that read results/ and show model metrics.
// Run locally: npm start (then open http://localhost:8766/)
// All calculated values come from m11.js.

import * as m11 from "./m11.js";

const TRAIN = "Training";
const TEST = "Test";

const SECTIONS = [
  "1. Beyond Accuracy",
  "2. A Threshold for the Job",
  "3. Ranking vs. Being Right",
  "4. Training vs. Test"
];

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
})[c]);

const int = (n) => n.toLocaleString("en-US");

const state = {
  section: SECTIONS[0],
  key: "readmission",
  model: "logreg"
};

const cache = {};

async function load(name) {
  if (!(name in cache)) {
    const r = await fetch(`../results/${name}.json`);
    cache[name] = r.ok ? await r.json() : null;
  }
  return cache[name];
}

const caption = (text) =>
  `<p class="caption">${esc(text)}</p>`;

const starterNote = (text) =>
  `<p class="info">Starter display: ${esc(text)} Build this section up to its required minimum.</p>`;

// Table helper
function table(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);

  const head = cols
    .map((c) => `<th scope="col">${esc(c)}</th>`)
    .join("");

  const body = rows.map((r) =>
    "<tr>" +
    cols.map((c, i) =>
      i === 0
        ? `<th scope="row">${esc(r[c])}</th>`
        : `<td class="num">${esc(r[c])}</td>`
    ).join("") +
    "</tr>"
  ).join("");

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

// Recommendations
async function recommendations() {
  const recs = (await load("decisions"))?.recommendations || {};
  const any = Object.values(recs).some(Boolean);
  const target = $("recommendations");

  target.innerHTML = any
    ? m11.DATASETS.map((k) =>
        `<p><strong>${esc(m11.DATASET_LABEL[k])}:</strong> ${
          recs[k] ? esc(recs[k]) : "<em>not written yet</em>"
        }</p>`
      ).join("")
    : caption(
        "No recommendations yet: fill in Recommendations in DECISIONS.md, run python -m analysis, then commit and push."
      );
}

// ---- 1. Beyond Accuracy ------------------------------------------------------

function beyondAccuracy(res, model) {
  const [p, y] = m11.preds(res, model);
  const c = m11.confusion(p, y, 0.5);
  const m = m11.metrics(c);
  const majority = m11.majorityAccuracy(y);

  return `
    ${caption(`${TEST} · ${m11.MODEL_LABEL[model]}, threshold 0.50`)}

    <h3>Test Set Overview</h3>
    ${table([{
      "Test patients": int(m.n),
      "Positive patients": int(m.positives),
      "Prevalence": m11.fmtPct(m.prevalence),
      "Majority baseline accuracy": m11.fmtPct(majority)
    }])}

    <h3>Test Confusion Matrix — Threshold 0.50</h3>
    <p>Rows show actual outcomes. Columns show model predictions.</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Actual / Predicted</th>
            <th scope="col">Predicted Positive</th>
            <th scope="col">Predicted Negative</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Actual Positive</th>
            <td>${int(c.tp)} (TP)</td>
            <td>${int(c.fn)} (FN)</td>
          </tr>
          <tr>
            <th scope="row">Actual Negative</th>
            <td>${int(c.fp)} (FP)</td>
            <td>${int(c.tn)} (TN)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Test Performance — ${esc(m11.MODEL_LABEL[model])}</h3>
    ${table([{
      "Accuracy": m11.fmtPct(m.accuracy),
      "Sensitivity": m11.fmtPct(m.sensitivity),
      "Specificity": m11.fmtPct(m.specificity),
      "Precision": m.precision == null
        ? "N/A (no positive predictions)"
        : m11.fmtPct(m.precision)
    }])}

    <h3>What These Metrics Mean</h3>
    <p><strong>Accuracy:</strong> Of all test patients, the percentage classified correctly.</p>
    <p><strong>Sensitivity:</strong> Of patients who actually have the positive outcome, the percentage correctly identified.</p>
    <p><strong>Specificity:</strong> Of patients who actually have the negative outcome, the percentage correctly identified.</p>
    <p><strong>Precision:</strong> Of patients flagged positive, the percentage who actually have the positive outcome.</p>
    <p><strong>Why accuracy alone is not enough:</strong> A model can achieve high accuracy by predicting the majority class while missing patients with the positive outcome.</p>
    <p><strong>Important:</strong> These results use the test patients, not the training patients.</p>
  `;
}

// ---- 2. A Threshold for the Job ---------------------------------------------

function thresholdResults(p, y, cutoff) {
  const c = m11.confusion(p, y, cutoff);
  const m = m11.metrics(c);

  return `
    <h3>Test Performance — Threshold ${cutoff.toFixed(2)}</h3>
    ${table([{
      Metric: "Sensitivity",
      Value: m11.fmtPct(m.sensitivity)
    }, {
      Metric: "Specificity",
      Value: m11.fmtPct(m.specificity)
    }, {
      Metric: "Precision",
      Value: m.precision == null
        ? "N/A (no positive predictions)"
        : m11.fmtPct(m.precision)
    }, {
      Metric: "Flagged per 100 patients",
      Value: m.flagged_per_100.toFixed(1)
    }])}

    <h3>Test Confusion Matrix</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Actual outcome</th>
            <th scope="col">Predicted positive</th>
            <th scope="col">Predicted negative</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Positive</th>
            <td>${int(c.tp)}</td>
            <td>${int(c.fn)}</td>
          </tr>
          <tr>
            <th scope="row">Negative</th>
            <td>${int(c.fp)}</td>
            <td>${int(c.tn)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Classification Errors</h3>
    <p><strong>Missed positive patients (FN):</strong> ${int(c.fn)}</p>
    <p><strong>False alarms (FP):</strong> ${int(c.fp)}</p>

    <h3>Understanding the Threshold</h3>
    <p><strong>Lower threshold:</strong> More patients are flagged positive. Sensitivity generally increases, but false alarms may also increase.</p>
    <p><strong>Higher threshold:</strong> Fewer patients are flagged positive. False alarms generally decrease, but more positive patients may be missed.</p>
  `;
}

function threshold(res, model) {
  const [p, y] = m11.preds(res, model);

  return `
    ${caption(`${TEST} · ${m11.MODEL_LABEL[model]}`)}

    <h3>Test Threshold Explorer</h3>
    <p>Adjust the decision threshold to see how the model's predictions change on the test patients.</p>

    <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin:18px 0;">
      <label for="threshold-slider"><strong>Decision threshold:</strong></label>
      <input
        id="threshold-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value="0.50"
        style="flex:1; min-width:180px; accent-color:var(--accent, #3b82f6);"
      >
      <strong id="threshold-value" aria-live="polite">0.50</strong>
    </div>

    <div id="threshold-results">
      ${thresholdResults(p, y, 0.5)}
    </div>
  `;
}

// ---- 3. Ranking vs. Being Right ---------------------------------------------

function ranking(res) {
  const rows = m11.MODELS
    .filter((model) => model in res.models)
    .map((model) => {
      const [p, y] = m11.preds(res, model);
      const c = m11.confusion(p, y, 0.5);
      const metrics = m11.metrics(c);
      const auc = m11.auroc(p, y);

      return {
        model,
        label: m11.MODEL_LABEL[model],
        auc,
        accuracy: metrics.accuracy
      };
    });

  const chartRows = rows.map((r, i) => `
    <div style="margin: 16px 0;">
      <div style="display:flex; justify-content:space-between; gap:12px;">
        <strong>${esc(r.label)}</strong>
        <strong>${m11.fmtNum(r.auc, 3)}</strong>
      </div>

      <div style="
        background:var(--panel);
        border:1px solid var(--line);
        border-radius:6px;
        height:18px;
        overflow:hidden;
        margin-top:6px;
      ">
        <div style="
          background:var(--series-${i + 1});
          width:${r.auc === null ? 0 : r.auc * 100}%;
          height:100%;
          border-radius:5px;
        "></div>
      </div>
    </div>
  `).join("");

  return `
    ${caption(`${TEST} · Comparison of all classification models`)}

    <h3>AUROC Comparison</h3>
    <p>
      AUROC measures how well a model distinguishes positive patients
      from negative patients across different decision thresholds.
      Higher values indicate better ranking performance.
    </p>

    ${chartRows}

    <h3>Model Performance Comparison</h3>
    ${table(rows.map((r) => ({
      Model: r.label,
      AUROC: m11.fmtNum(r.auc, 3),
      Accuracy: m11.fmtPct(r.accuracy)
    })))}

    <h3>Understanding the Results</h3>
    <p><strong>AUROC:</strong> Measures how well the model ranks positive patients above negative patients across thresholds.</p>
    <p><strong>Accuracy:</strong> Measures the percentage of patients classified correctly at the 0.50 threshold.</p>
    <p><strong>Why they differ:</strong> A model can rank patients well overall but still make poor classifications at a particular threshold.</p>
    <p><strong>Important:</strong> These results use the test patients, not the training patients.</p>
  `;
}

// ---- 4. Training vs. Test ----------------------------------------------------

function trainVsTest(res) {
  const s = m11.aurocSummary(res);

  const rows = Object.entries(s).map(([model, v]) => ({
    Model: m11.MODEL_LABEL[model],
    [`${TRAIN} AUROC`]: m11.fmtNum(v.train, 3),
    [`${TEST} AUROC`]: m11.fmtNum(v.test, 3),
    "Performance gap": m11.fmtNum(v.train - v.test, 3)
  }));

  const charts = Object.entries(s).map(([model, v]) => `
    <div style="margin: 20px 0;">
      <strong>${esc(m11.MODEL_LABEL[model])}</strong>

      <div style="margin-top:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Training</span>
          <strong>${m11.fmtNum(v.train, 3)}</strong>
        </div>
        <div style="
          background:var(--panel);
          border:1px solid var(--line);
          border-radius:5px;
          height:16px;
          overflow:hidden;
        ">
          <div style="
            background:#3b82f6;
            width:${v.train * 100}%;
            height:100%;
          "></div>
        </div>
      </div>

      <div style="margin-top:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Test</span>
          <strong>${m11.fmtNum(v.test, 3)}</strong>
        </div>
        <div style="
          background:var(--panel);
          border:1px solid var(--line);
          border-radius:5px;
          height:16px;
          overflow:hidden;
        ">
          <div style="
            background:#22c55e;
            width:${v.test * 100}%;
            height:100%;
          "></div>
        </div>
      </div>
    </div>
  `).join("");

  return `
    ${caption(`${TRAIN} and ${TEST} · AUROC comparison`)}

    <h3>Training vs. Test AUROC</h3>
    <p>
      Training AUROC measures performance on the data used to train
      the model. Test AUROC measures performance on new data that
      the model did not see during training.
    </p>

    ${charts}

    <h3>Model Performance Comparison</h3>
    ${table(rows)}

    <h3>Understanding the Results</h3>
    <p><strong>Training performance:</strong> How well the model performs on the data it learned from.</p>
    <p><strong>Test performance:</strong> How well the model performs on unfamiliar data.</p>
    <p><strong>Performance gap:</strong> A large difference between training and test AUROC can indicate overfitting.</p>
    <p><strong>Overfitting:</strong> When a model learns the training data very well but does not perform as well on new data.</p>
    <p><strong>Important:</strong> Test performance provides a better indication of how well the model may generalize to new patients.</p>
  `;
}

// ---- Section routing --------------------------------------------------------

const RENDER = Object.fromEntries(
  SECTIONS.map((s, i) => [
    s,
    [beyondAccuracy, threshold, ranking, trainVsTest][i]
  ])
);

// ---- Page -------------------------------------------------------------------

async function render() {
  const { section, key, model } = state;
  const res = await load(key);

  $("section-title").textContent = section;
  const content = $("content");

  if (!res) {
    $("context").textContent = "";
    content.innerHTML = `
      <p class="warn">
        No results for ${esc(m11.DATASET_LABEL[key])} yet:
        run <code>python -m analysis</code>,
        then commit and push <code>results/</code>.
      </p>
    `;
    return;
  }

  $("context").textContent =
    `${m11.DATASET_LABEL[key]}: ${int(res.train.n)} training rows (${int(res.train.n_pos)} positive), ` +
    `${int(res.test.n)} test rows (${int(res.test.n_pos)} positive).`;

  [...$("model").options].forEach((o) => {
    o.text =
      m11.MODEL_LABEL[o.value] +
      (o.value in res.models ? "" : " (not trained yet)");
  });

  content.innerHTML = model in res.models
    ? RENDER[section](res, model)
    : `
      <p class="warn">
        ${esc(m11.MODEL_LABEL[model])} has no results yet:
        run <code>python -m analysis</code>,
        then commit and push <code>results/</code>.
      </p>
    `;

  // Connect the threshold slider after its HTML has been inserted.
  const slider = $("threshold-slider");
  if (slider && model in res.models) {
    const [p, y] = m11.preds(res, model);
    const value = $("threshold-value");
    const results = $("threshold-results");

    slider.addEventListener("input", () => {
      const cutoff = Number(slider.value);
      value.textContent = cutoff.toFixed(2);
      results.innerHTML = thresholdResults(p, y, cutoff);
    });
  }
}

// ---- Initialization ---------------------------------------------------------

function init() {
  $("sections").innerHTML = SECTIONS.map((s, i) => `
    <label class="radio">
      <input
        type="radio"
        name="section"
        value="${i}"
        ${s === state.section ? "checked" : ""}
      >
      ${esc(s)}
    </label>
  `).join("");

  $("dataset").innerHTML = m11.DATASETS.map((k) =>
    `<option value="${k}">${esc(m11.DATASET_LABEL[k])}</option>`
  ).join("");

  $("model").innerHTML = m11.MODELS.map((m) =>
    `<option value="${m}">${esc(m11.MODEL_LABEL[m])}</option>`
  ).join("");

  $("dataset").value = state.key;
  $("model").value = state.model;

  $("sections").addEventListener("change", (e) => {
    state.section = SECTIONS[Number(e.target.value)];
    render();
  });

  $("dataset").addEventListener("change", (e) => {
    state.key = e.target.value;
    render();
  });

  $("model").addEventListener("change", (e) => {
    state.model = e.target.value;
    render();
  });

  recommendations();
  render();
}

init();