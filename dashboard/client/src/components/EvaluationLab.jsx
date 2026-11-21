import { useEffect, useState } from 'react';
import api from '../api.js';

export default function EvaluationLab() {
  const [cases, setCases] = useState([]);
  const [runs, setRuns] = useState([]);
  const [name, setName] = useState('');
  const [filesText, setFilesText] = useState('[{"path":"src/example.js","content":""}]');
  const [expectedText, setExpectedText] = useState('[]');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = () => Promise.all([api.getEvaluationCases(), api.getEvaluationRuns()]).then(([c, r]) => { setCases(c); setRuns(r); });
  useEffect(() => { refresh().catch((e) => setError(e.response?.data?.error || e.message)); }, []);
  const addCase = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.createEvaluationCase({ name, files: JSON.parse(filesText), expectedFindings: JSON.parse(expectedText) }); setName(''); await refresh(); }
    catch (e) { setError(e.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  const runCase = async (id) => { setBusy(true); setError(''); try { await api.runEvaluationCase(id); await refresh(); } catch (e) { setError(e.response?.data?.error || e.message); } finally { setBusy(false); } };
  return <section className="evaluation-lab">
    <header><h2>Evaluation Lab</h2><p>Build a labeled set of code examples and measure reviewer precision, recall, F1, and latency.</p></header>
    {error && <div className="state-msg state-error">{error}</div>}
    <form onSubmit={addCase} className="evaluation-form">
      <label>Case name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="SQL injection example" /></label>
      <label>Input files (JSON)<textarea required rows="5" value={filesText} onChange={(e) => setFilesText(e.target.value)} /></label>
      <label>Expected findings (JSON)<textarea rows="4" value={expectedText} onChange={(e) => setExpectedText(e.target.value)} /></label>
      <button disabled={busy || !name.trim()}>Add labeled case</button>
    </form>
    <h3>Cases</h3>{cases.map((c) => <article className="evaluation-row" key={c.id}><strong>{c.name}</strong><span>{c.expected_findings?.length || 0} expected</span><button disabled={busy} onClick={() => runCase(c.id)}>Run reviewer</button></article>)}
    <h3>Results</h3>{runs.map((r) => <article className="evaluation-row" key={r.id}><strong>{r.case_name}</strong><span>P {(Number(r.metrics?.precision || 0) * 100).toFixed(0)}% · R {(Number(r.metrics?.recall || 0) * 100).toFixed(0)}% · F1 {(Number(r.metrics?.f1 || 0) * 100).toFixed(0)}%</span><span>{(r.duration_ms / 1000).toFixed(1)}s</span></article>)}
    {!runs.length && <p className="muted">No runs yet. Add known examples, then run the reviewer to establish a baseline.</p>}
  </section>;
}
