
// Four sections reading exported results only; all metrics use m11.js.
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
  model: "logreg",
  cutoff: 0.50
};

const cache = {};

async function load(name) {
  if (!(name in cache)) {
    try {
      const r = await fetch(`../results/${name}.json`);
      if (!r.ok) return null;
      cache[name] = await r.json();
    } catch { return null; }
  }
  return cache[name];
}

const caption = (text) =>
  `<p class="caption">${esc(text)}</p>`;

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

  target.innerHTML = '<h2 id="rec-h">Recommendations</h2>' + (any
    ? m11.DATASETS.map((k) =>
        `<p><strong>${esc(m11.DATASET_LABEL[k])}:</strong> ${
          recs[k] ? esc(recs[k]) : "<em>not written yet</em>"
        }</p>`
      ).join("")
    : caption(
        "No recommendations yet: fill in Recommendations in DECISIONS.md, run python -m analysis, then commit and push."
      ));
}

const JOB = {
  readmission: "At discharge, predict readmission within 30 days. Positive means readmitted within 30 days; negative means no readmission within 30 days. These are historical inpatient stays involving diabetes, not all hospital discharges.",
  diabetes: "Flag adults for follow-up testing. Positive means reported doctor diagnosis or HbA1c ≥ 6.5%; negative means neither. This label includes already diagnosed adults and describes current status, not future diabetes."
};

function matrix(c, title) {
  return `<h3>${esc(title)}</h3>${table([
    {"Actual / Predicted": "Positive", "Predicted positive": `${int(c.tp)} · TP: caught positives`, "Predicted negative": `${int(c.fn)} · FN: missed positives`},
    {"Actual / Predicted": "Negative", "Predicted positive": `${int(c.fp)} · FP: false alarms`, "Predicted negative": `${int(c.tn)} · TN: correctly unflagged`}
  ])}`;
}

function performance(res, model, cutoff, part = "test") {
  const c = m11.confusion(...m11.preds(res, model, part), cutoff);
  const m = m11.metrics(c);
  return { Model: m11.MODEL_LABEL[model], Accuracy: m11.fmtPct(m.accuracy),
    "Sensitivity (recall / TPR)": m11.fmtPct(m.sensitivity), Specificity: m11.fmtPct(m.specificity),
    FPR: m11.fmtPct(m.fpr), Precision: m11.fmtPct(m.precision), F1: m11.fmtNum(m.f1) };
}

// Axes are proportions on [0, 1]; plotted coordinates come from m11 helpers.
function plot(lines, title, xLabel, yLabel, dots = false) {
  const x = v => 65 + v * 420, y = v => 335 - v * 280;
  return `<figure><figcaption>${esc(title)}</figcaption>
    <svg viewBox="0 0 540 400" role="img" aria-label="${esc(title)}">
    ${[0, .25, .5, .75, 1].map(v => `<line class="grid" x1="65" x2="485" y1="${y(v)}" y2="${y(v)}"/><text x="52" y="${y(v)+4}" text-anchor="end">${v}</text><text x="${x(v)}" y="356" text-anchor="middle">${v}</text>`).join("")}
    <path class="axis" fill="none" d="M65 55 V335 H485"/>
    <path class="diag" d="M65 335 L485 55"/>
    ${lines.map((l,i) => `<polyline fill="none" stroke="var(--series-${i+1})" stroke-width="2" points="${l.points.map(([a,b]) => `${x(a)},${y(b)}`).join(" ")}"/>${dots ? l.points.map(([a,b]) => `<circle cx="${x(a)}" cy="${y(b)}" r="4" fill="var(--series-${i+1})"/>`).join("") : ""}`).join("")}
    <text x="275" y="389" text-anchor="middle">${esc(xLabel)}</text>
    <text transform="translate(16 195) rotate(-90)" text-anchor="middle">${esc(yLabel)}</text></svg>
    <div class="legend">${lines.map((l,i) => `<span><i style="background:var(--series-${i+1})"></i>${esc(l.label)}</span>`).join("")}</div></figure>`;
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
        ? "undefined (no positive predictions)"
        : m11.fmtPct(m.precision)
    }])}

    <h3>Test · All five models at threshold 0.50</h3>
    ${table(m11.MODELS.map(name => performance(res, name, 0.50)))}
    <div class="cols">${m11.MODELS.map(name => matrix(m11.confusion(...m11.preds(res, name), 0.50), `Test · ${m11.MODEL_LABEL[name]} · 0.50`)).join("")}</div>
    <h3>What These Metrics Mean</h3>
    <p><strong>FPR:</strong> Of patients without the outcome, the share incorrectly flagged (one minus specificity). <strong>F1:</strong> The harmonic mean of precision and sensitivity: 2TP ÷ (2TP + FP + FN).</p>
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
    <h3>Test · 0.50 versus selected threshold</h3>
    ${table([0.50, cutoff].map((t,i) => {
      const c = m11.confusion(p,y,t), m = m11.metrics(c);
      return {Threshold: `${i ? "Selected" : "Reference"} ${t.toFixed(2)}`, Accuracy: m11.fmtPct(m.accuracy), Sensitivity: m11.fmtPct(m.sensitivity), Specificity: m11.fmtPct(m.specificity), Precision: m11.fmtPct(m.precision), "Flagged per 100": m11.fmtNum(m.flagged_per_100,1), "False alarms per 100": m11.fmtNum(m.false_alarms_per_100,1), "Missed positives": int(c.fn)};
    }))}
    <div class="cols">${matrix(m11.confusion(p,y,0.50), "Test · Reference threshold 0.50")}${matrix(c, `Test · Selected threshold ${cutoff.toFixed(2)}`)}</div>
    ${state.key === "diabetes" ? `<p class="info">Screening target: sensitivity ≥ 90%. Selected threshold ${m.sensitivity >= .90 ? "meets" : "does not meet"} this target on Test patients. Choosing a threshold on these test results makes the measured sensitivity optimistic; validate it on separate patients.</p>` : "<p>There is no fixed sensitivity target for readmission. Weigh missed readmissions against the follow-up workload.</p>"}
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
    <p>Flag a patient when their predicted probability is at least the threshold. The threshold is a decision separate from fitting the model: changing it changes the flags, not the probabilities or AUROC.</p>

    <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin:18px 0;">
      <label for="threshold-slider"><strong>Decision threshold:</strong></label>
      <input
        id="threshold-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value="${state.cutoff.toFixed(2)}"
        style="flex:1; min-width:180px; accent-color:var(--accent, #3b82f6);"
      >
      <strong id="threshold-value" aria-live="polite">${state.cutoff.toFixed(2)}</strong>
    </div>

    <div id="threshold-results">
      ${thresholdResults(p, y, state.cutoff)}
    </div>
  `;
}

// ---- 3. Ranking vs. Being Right ---------------------------------------------

function ranking(res, model) {
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

    <h3>Test · ROC curves for all five models</h3>
    <p>The horizontal axis is the false positive rate: of patients without the outcome, the share flagged. The vertical axis is sensitivity: of patients with the outcome, the share flagged. Each point uses a different threshold; the dashed diagonal represents chance ranking.</p>
    ${plot(m11.MODELS.map(name => {const r = m11.roc(...m11.preds(res,name)); return {label:m11.MODEL_LABEL[name], points:r.fpr.map((v,i) => [v,r.tpr[i]])};}), "Test · ROC comparison", "False positive rate", "Sensitivity / true positive rate")}
    <h3>Test · Probability calibration — ${esc(m11.MODEL_LABEL[model])}</h3>
    <p>Ranking is separate from reliable probabilities. Compare the average predicted probability with the observed share of positives in ten roughly equal-size groups. Points near the dashed diagonal agree; above it the model underestimates risk, below it overestimates risk. Groups with tied probabilities may differ by chance.</p>
    ${plot([{label:m11.MODEL_LABEL[model], points:m11.calibration(...m11.preds(res,model)).map(b => [b.mean_pred,b.observed])}], "Test · Calibration", "Mean predicted probability", "Observed positive share", true)}
    ${table(m11.calibration(...m11.preds(res,model)).map((b,i) => ({"Test group":i+1, Patients:int(b.n), "Mean predicted":m11.fmtPct(b.mean_pred), "Observed positive share":m11.fmtPct(b.observed)})))}
    <p>AUROC is the chance a randomly chosen positive receives a higher score than a randomly chosen negative, with ties counting half. It does not give accuracy, choose a threshold, guarantee calibrated probabilities, or establish clinical usefulness.</p>
    <h3>Test · AUROC Comparison</h3>
    <p>
      AUROC measures how well a model distinguishes positive patients
      from negative patients across different decision thresholds.
      Higher values indicate better ranking performance.
    </p>

    ${chartRows}

    <h3>Test · Model Performance Comparison at threshold 0.50</h3>
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

function trainVsTest(res, model) {
  const s = m11.aurocSummary(res);

  const rows = Object.entries(s).map(([model, v]) => ({
    Model: m11.MODEL_LABEL[model],
    [`${TRAIN} AUROC`]: m11.fmtNum(v.train, 3),
    [`${TEST} AUROC`]: m11.fmtNum(v.test, 3),
    "Performance gap": m11.fmtNum(v.gap, 3)
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

    <h3>Selected model · ${esc(m11.MODEL_LABEL[model])}</h3>
    ${table(["train","test"].map(part => ({Partition:part === "train" ? TRAIN : TEST, Patients:int(res[part].n), ...performance(res,model,0.50,part), AUROC:m11.fmtNum(s[model][part])})))}
    <p>Selected-model classification metrics use threshold 0.50. Training rows were used to fit the model and its preprocessing; Test rows were held out using the supplied split.</p>
    <h3>Training vs. Test AUROC</h3>
    <p>
      Training AUROC measures performance on the data used to train
      the model. Test AUROC measures performance on new data that
      the model did not see during training.
    </p>

    ${charts}

    <h3>Training and Test · All-model AUROC comparison</h3>
    ${table(rows)}

    <h3>Understanding the Results</h3>
    <p><strong>Training performance:</strong> How well the model performs on the data it learned from.</p>
    <p><strong>Test performance:</strong> How well the model performs on unfamiliar data.</p>
    <p><strong>Performance gap:</strong> A large difference between training and test AUROC can indicate overfitting.</p>
    <p><strong>Overfitting:</strong> When a model learns the training data very well but does not perform as well on new data.</p>
    <p>Training results flatter models. Large positive gaps are evidence of overfitting, not proof that any individual patient was memorised. A slightly higher Test AUROC can occur by sampling variation. These samples do not establish safety, fairness, or performance in another hospital or population; prospective validation and capacity planning are still needed.</p>
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

let renderVersion = 0;
async function render() {
  const version = ++renderVersion;
  const { section, key, model } = state;
  const res = await load(key);
  if (version !== renderVersion) return;

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

  content.innerHTML = `<p class="info">${esc(JOB[key])}</p>` + (model in res.models
    ? RENDER[section](res, model)
    : `
      <p class="warn">
        ${esc(m11.MODEL_LABEL[model])} has no results yet:
        run <code>python -m analysis</code>,
        then commit and push <code>results/</code>.
      </p>
    `);

  // Connect the threshold slider after its HTML has been inserted.
  const slider = $("threshold-slider");
  if (slider && model in res.models) {
    const [p, y] = m11.preds(res, model);
    const value = $("threshold-value");
    const results = $("threshold-results");

    slider.addEventListener("input", () => {
      const cutoff = Number(slider.value);
      state.cutoff = cutoff;
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