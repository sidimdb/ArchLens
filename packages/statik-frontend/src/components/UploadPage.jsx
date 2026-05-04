import React, { useRef, useState } from 'react';
import { Icon } from './Layout.jsx';

const RULES = [
  { n: '01', title: 'Service layer usage', desc: 'All network calls (fetch, axios) must originate from service files — never from screens, components, hooks or utils.' },
  { n: '02', title: 'No circular dependencies', desc: 'Identification of imports that create tight coupling loops.' },
  { n: '03', title: 'Complexity limits', desc: 'Monitoring file length, exports, useState/useEffect counts, and JSX nesting depth.' },
  { n: '04', title: 'Layer separation', desc: 'Ensuring screens, components, services and utils stay in their lanes.' },
  { n: '05', title: 'Rules of Hooks', desc: 'Hooks called only at the top level of components or custom hooks — never inside conditions, loops, or non-React functions.' },
  { n: '06', title: 'Inline styles', desc: 'JSX style attributes should reference StyleSheet.create entries, not inline object literals that re-allocate every render.' },
  { n: '07', title: 'Naming conventions', desc: 'PascalCase for components and screens, useXxx for hooks, camelCase for services — file names and default exports both checked.' },
  { n: '08', title: 'Native APIs in UI', desc: 'Screens and components must not call AsyncStorage, Platform, NativeModules, Linking, etc. directly — wrap them in a hook or service.' },
];

export default function UploadPage({ onUpload, onGithub, error }) {
  const inputRef = useRef();
  const [tab, setTab] = useState('zip'); // 'zip' | 'public' | 'private'
  const [dragOver, setDragOver] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');

  function pick(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload a .zip archive.');
      return;
    }
    onUpload(file);
  }

  function submitGithub(e) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    onGithub(repoUrl.trim(), tab === 'private' ? token.trim() : '');
  }

  return (
    <div className="px-6 py-4 flex flex-col min-h-screen">
      {/* Hero + input — grows to fill all available vertical space */}
      <div className="flex-1 flex flex-col items-center w-full pt-6 pb-8">
        {/* Hero */}
        <section className="max-w-3xl w-full text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface leading-[1.1] mb-2 whitespace-nowrap">
            Measure your{' '}
            <span className="text-on-surface-variant italic">React Native</span>{' '}
            architecture
          </h1>
          <p className="text-body-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
            8 architectural rules. Deterministic static analysis. A single
            score out of 100.
          </p>
        </section>

        {/* Input Card */}
        <section className="max-w-xl w-full flex-1 flex flex-col">
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-2xl shadow-black/30 flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-outline-variant bg-surface-container-low">
            {[
              { key: 'zip', label: 'ZIP Upload', icon: 'folder_zip' },
              { key: 'public', label: 'Public Repo', icon: 'public' },
              { key: 'private', label: 'Private Repo', icon: 'lock' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'flex-1 py-2.5 px-3 text-body-sm border-b-2 transition-colors flex items-center justify-center gap-1.5 ' +
                  (tab === t.key
                    ? 'border-on-surface text-on-surface font-bold bg-surface-container'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface font-medium')
                }
              >
                <Icon name={t.icon} className="text-base" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Body — grows to fill the card so all three tabs render the same size */}
          <div className="p-6 flex-1 flex flex-col min-h-[320px]">
            {tab === 'zip' && (
              <>
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer group flex-1 flex flex-col items-center justify-center ' +
                    (dragOver
                      ? 'border-on-surface bg-surface-container-high'
                      : 'border-outline-variant hover:border-outline')
                  }
                >
                  <div className="mb-2">
                    <Icon
                      name="cloud_upload"
                      className="text-3xl text-on-surface-variant group-hover:text-on-surface transition-colors"
                    />
                  </div>
                  <p className="text-body-sm text-on-surface mb-0.5">
                    Drag and drop your project ZIP here
                  </p>
                  <p className="text-mono-label text-on-surface-variant">
                    Maximum file size: 50MB
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => pick(e.target.files?.[0])}
                  />
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="bg-on-surface text-surface font-bold px-8 py-2.5 rounded-lg hover:bg-on-surface-variant transition-all active:scale-95 text-body-sm uppercase tracking-tight"
                  >
                    Start Analysis
                  </button>
                </div>
              </>
            )}

            {(tab === 'public' || tab === 'private') && (
              <form
                onSubmit={submitGithub}
                className="flex-1 flex flex-col"
              >
                {/* Top icon block — mirrors the ZIP drop zone */}
                <div className="flex flex-col items-center text-center mb-5">
                  <Icon
                    name={tab === 'private' ? 'lock' : 'public'}
                    className="text-3xl text-on-surface-variant mb-1.5"
                  />
                  <p className="text-body-sm text-on-surface mb-0.5">
                    {tab === 'private'
                      ? 'Analyze a private GitHub repository'
                      : 'Analyze a public GitHub repository'}
                  </p>
                  <p className="text-mono-label text-on-surface-variant">
                    {tab === 'private'
                      ? 'Token is used once and never stored'
                      : 'Paste a repository URL to begin'}
                  </p>
                </div>

                {/* Inputs */}
                <div className="space-y-3 flex-1">
                  <label className="block">
                    <span className="text-mono-label uppercase tracking-widest text-on-surface-variant block mb-1">
                      Repository URL
                    </span>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/my-react-native-app"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-on-surface transition-colors"
                    />
                  </label>

                  {tab === 'private' && (
                    <label className="block">
                      <span className="text-mono-label uppercase tracking-widest text-on-surface-variant block mb-1">
                        Personal Access Token
                      </span>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_..."
                        autoComplete="off"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface font-mono focus:outline-none focus:border-on-surface transition-colors"
                      />
                    </label>
                  )}
                </div>

                {/* Submit pinned to bottom */}
                <div className="flex justify-center mt-4">
                  <button
                    type="submit"
                    disabled={!repoUrl.trim()}
                    className="bg-on-surface text-surface font-bold px-8 py-2.5 rounded-lg hover:bg-on-surface-variant transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-body-sm uppercase tracking-tight"
                  >
                    Start Analysis
                  </button>
                </div>
              </form>
            )}

            {error && (
              <div className="mt-3 p-3 rounded-md bg-status-fail/10 border border-status-fail/30 text-body-sm text-status-fail">
                {error}
              </div>
            )}
          </div>
          </div>
        </section>
      </div>

      {/* Rules grid — pinned to bottom of viewport */}
      <section className="max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-[1px] flex-1 bg-outline-variant" />
          <h2 className="text-mono-label font-black tracking-[0.2em] text-on-surface-variant uppercase">
            Core Analysis Rules
          </h2>
          <div className="h-[1px] flex-1 bg-outline-variant" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {RULES.map((r) => (
            <div
              key={r.n}
              className="bg-surface-container-low border border-outline-variant p-3 rounded-lg hover:border-outline transition-all"
            >
              <div className="text-on-surface-variant text-mono-label mb-1">
                {r.n}
              </div>
              <h3 className="text-on-surface text-body-sm font-bold mb-1">
                {r.title}
              </h3>
              <p className="text-on-surface-variant text-mono-label leading-snug">
                {r.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
