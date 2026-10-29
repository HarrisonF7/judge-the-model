// No packages required: exercise the app's renderers and event handlers with exported data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import * as m11 from '../web/m11.js';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const data = Object.fromEntries([...m11.DATASETS, 'decisions'].map(k => [k, JSON.parse(read(`results/${k}.json`))]));
const source = read('web/app.js').replace('import * as m11 from "./m11.js";', '').replace(/init\(\);\s*$/, '');
function harness(fetcher = async url => ({ok:true, json:async () => data[url.match(/(\w+)\.json$/)[1]]})) {
  const elements = {};
  const element = id => elements[id] ||= {innerHTML:'', textContent:'', options:[], listeners:{}, addEventListener(name,fn){this.listeners[name]=fn;}};
  const ctx = vm.createContext({m11, document:{getElementById:element}, fetch:fetcher});
  vm.runInContext(source,ctx);
  return {elements, ctx, run: code => vm.runInContext(code,ctx)};
}
test('Python and JavaScript metric helpers agree on all exported predictions', () => {
  const py = process.env.PYTHON || new URL('.venv/bin/python', root).pathname;
  const expected = JSON.parse(execFileSync(py, ['-c', `import json,m11
out={}
for key in m11.DATASETS:
 r=m11.load(key); out[key]={}
 for model in m11.MODELS:
  out[key][model]={}
  for part in ['train','test']:
   p,y=m11.preds(r,model,part)
   out[key][model][part]={'auroc':m11.auroc(p,y),'calibration':m11.calibration(p,y),'confusions':{str(t):m11.confusion(p,y,t) for t in [0,.06,.5,1]},'metrics':{str(t):m11.metrics(m11.confusion(p,y,t)) for t in [0,.06,.5,1]}}
print(json.dumps(out))`], {cwd:root, encoding:'utf8'}));
  for (const key of m11.DATASETS) for (const model of m11.MODELS) for (const part of ['train','test']) {
    const [p,y] = m11.preds(data[key],model,part), e = expected[key][model][part];
    assert.equal(m11.auroc(p,y), e.auroc);
    assert.deepEqual(m11.calibration(p,y),e.calibration);
    for (const [t,c] of Object.entries(e.confusions)) {
      const actual = m11.confusion(p,y,Number(t));
      assert.deepEqual(actual,c);
      assert.deepEqual(m11.metrics(actual),e.metrics[t]);
    }
    const roc = m11.roc(p,y);
    const area = roc.fpr.slice(1).reduce((sum,x,i) => sum + (x-roc.fpr[i])*(roc.tpr[i+1]+roc.tpr[i])/2,0);
    assert.ok(Math.abs(area-e.auroc)<1e-12);
    assert.equal(roc.fpr.at(-1),1); assert.equal(roc.tpr.at(-1),1);
  }
});
test('all four sections render for both datasets and all five models', async () => {
  const h=harness();
  for (const key of m11.DATASETS) for (const model of m11.MODELS) for (let section=0;section<4;section++) {
    await h.run(`state.key=${JSON.stringify(key)};state.model=${JSON.stringify(model)};state.section=SECTIONS[${section}];render()`);
    const html=h.elements.content.innerHTML;
    assert.ok(html.includes('Test'));
    assert.ok(html.includes(m11.MODEL_LABEL[model]));
    assert.doesNotMatch(html,/NaN|Infinity|not trained|Starter display/);
    if(section===0) { assert.equal((html.match(/TP: caught positives/g)||[]).length,5); assert.ok(html.includes('F1')); }
    if(section===2) { assert.equal((html.match(/<svg /g)||[]).length,2); assert.ok(html.includes('Observed positive share')); }
    if(section===3) assert.ok(html.includes('Training'));
  }
});
test('threshold input updates counts live and survives a re-render', async () => {
  const h=harness();
  await h.run('state.key="diabetes";state.model="logreg";state.section=SECTIONS[1];render()');
  h.elements['threshold-slider'].value='0.06';
  h.elements['threshold-slider'].listeners.input();
  const html=h.elements['threshold-results'].innerHTML;
  for(const text of ['97.0%','36.9%','26.5%','69.6','194','538','meets this target']) assert.ok(html.includes(text),text);
  await h.run('render()');
  assert.ok(h.elements.content.innerHTML.includes('value="0.06"'));
});
test('recommendations are preserved and have their accessible heading', async () => {
  const h=harness(); await h.run('recommendations()');
  assert.ok(h.elements.recommendations.innerHTML.includes('id="rec-h"'));
  for(const rec of Object.values(data.decisions.recommendations)) assert.ok(h.elements.recommendations.innerHTML.includes(rec));
});
test('missing and failed fetches show a recoverable message', async () => {
  for(const fetcher of [async()=>({ok:false}),async()=>{throw Error('offline');}]) {
    const h=harness(fetcher); await h.run('render()');
    assert.ok(h.elements.content.innerHTML.includes('No results'));
  }
});
test('a slower old dataset response cannot overwrite the latest selection', async () => {
  let resolveFirst;
  const h=harness(url => url.includes('readmission') ? new Promise(resolve => {resolveFirst=resolve;}) : Promise.resolve({ok:true,json:async()=>data.diabetes}));
  const first=h.run('render()');
  await h.run('state.key="diabetes";render()');
  resolveFirst({ok:true,json:async()=>data.readmission}); await first;
  assert.ok(h.elements.context.textContent.includes('Diabetes screening'));
});
test('undefined precision remains undefined and tied baseline AUROC is chance', () => {
  for(const key of m11.DATASETS) {
    const [p,y]=m11.preds(data[key],'baseline');
    assert.equal(m11.metrics(m11.confusion(p,y,.5)).precision,null);
    assert.equal(m11.fmtPct(null),'undefined');
    assert.equal(m11.auroc(p,y),.5);
  }
});
test('GitHub Pages assets resolve inside a repository subpath', () => {
  const base = new URL('https://example.github.io/judge-the-model/');
  const redirect = read('index.html').match(/url=([^"\s]+)/)[1];
  const page = new URL(redirect,base);
  assert.equal(page.pathname,'/judge-the-model/web/');
  const html=read('web/index.html');
  for(const [,path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url=new URL(path,page);
    assert.ok(url.pathname.startsWith(base.pathname));
    assert.ok(read(url.pathname.slice(base.pathname.length)).length);
  }
  for(const key of [...m11.DATASETS,'decisions']) {
    const url=new URL(`../results/${key}.json`,page);
    assert.ok(url.pathname.startsWith(base.pathname));
    assert.deepEqual(JSON.parse(read(url.pathname.slice(base.pathname.length))),data[key]);
  }
  assert.ok(read('web/app.js').includes('fetch(`../results/${name}.json`)'));
  assert.ok(read('web/app.js').includes('from "./m11.js"'));
  assert.equal(read('.nojekyll'),'');
});
