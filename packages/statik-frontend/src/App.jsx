import React, { useState } from 'react';
import Layout from './components/Layout.jsx';
import UploadPage from './components/UploadPage.jsx';
import AnalyzingPage from './components/AnalyzingPage.jsx';
import ReportPage from './components/ReportPage.jsx';

export default function App() {
  // view: 'upload' | 'analyzing' | 'report'
  const [view, setView] = useState('upload');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pendingName, setPendingName] = useState(null);

  async function handleUpload(file) {
    setView('analyzing');
    setError(null);
    // Keep the previous result visible — it will be replaced once the new
    // analysis succeeds. On error or cancel, the old report stays.
    setPendingName(file.name.replace(/\.zip$/i, ''));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/analyze', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      setView('report');
    } catch (e) {
      setError(e.message);
      setView('upload');
    }
  }

  async function handleGithub(url, token) {
    setView('analyzing');
    setError(null);
    // Keep the previous result visible — it will be replaced once the new
    // analysis succeeds. On error or cancel, the old report stays.
    // Derive a friendly name from the URL for the progress page
    const m = url.match(/([^/]+?)(?:\.git)?\/?$/);
    setPendingName(m ? m[1] : url);
    try {
      const res = await fetch('/analyze-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token: token || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      setView('report');
    } catch (e) {
      setError(e.message);
      setView('upload');
    }
  }

  // "New analysis" no longer wipes the previous report — it just goes back
  // to the upload page. The old report remains accessible via the sidebar
  // "Report" item until a new analysis succeeds (or the page is refreshed).
  function newAnalysis() {
    setError(null);
    setPendingName(null);
    setView('upload');
  }

  function navigate(target) {
    if (target === 'upload') return newAnalysis();
    if (target === 'report' && result) setView('report');
  }

  return (
    <Layout activeView={view} onNavigate={navigate} hasReport={!!result}>
      {view === 'upload' && (
        <UploadPage
          onUpload={handleUpload}
          onGithub={handleGithub}
          error={error}
        />
      )}
      {view === 'analyzing' && (
        <AnalyzingPage projectName={pendingName} onCancel={newAnalysis} />
      )}
      {view === 'report' && result && (
        <ReportPage data={result} onNewAnalysis={newAnalysis} />
      )}
    </Layout>
  );
}
