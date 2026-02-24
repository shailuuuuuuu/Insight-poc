import { useState, useMemo } from 'react';

const NDC_ELEMENTS = [
  { key: 'character', label: 'Character', desc2: 'Name or proper identifier', desc1: 'Generic description (boy, girl)', desc0: 'Only pronouns' },
  { key: 'setting', label: 'Setting', desc2: 'Activity AND location', desc1: 'Activity OR location', desc0: 'No setting info' },
  { key: 'problem', label: 'Problem', desc2: 'Complete & clear', desc1: 'Incomplete or unclear', desc0: 'No problem' },
  { key: 'feeling1', label: 'Feeling (Problem)', desc2: 'Specific emotion', desc1: 'General emotion/behavior', desc0: 'No emotion' },
  { key: 'plan', label: 'Plan', desc2: 'Cognitive verb + specific plan', desc1: 'Cognitive verb only', desc0: 'No cognitive verb' },
  { key: 'attempt', label: 'Attempt', desc2: 'Specific with dialogue', desc1: 'General without dialogue', desc0: 'No attempt' },
  { key: 'complication', label: 'Complication / Consequence', desc2: 'Complete & clear restated problem', desc1: 'Incomplete restated', desc0: 'No complication' },
  { key: 'feeling2', label: 'Feeling (Complication)', desc2: 'Specific emotion', desc1: 'General emotion/behavior', desc0: 'No emotion' },
  { key: 'plan2', label: 'Plan 2', desc2: 'Cognitive verb + specific plan', desc1: 'Cognitive verb only', desc0: 'No cognitive verb' },
  { key: 'attempt2', label: 'Attempt 2', desc2: 'Specific with dialogue', desc1: 'General without dialogue', desc0: 'No 2nd attempt' },
  { key: 'consequence', label: 'Consequence', desc2: 'Complete & clear result', desc1: 'Incomplete/unclear', desc0: 'No result' },
  { key: 'ending', label: 'Ending', desc2: 'Complete events after solving', desc1: 'Incomplete events', desc0: 'No events' },
  { key: 'endFeeling', label: 'Ending Feeling', desc2: 'Specific emotion', desc1: 'General emotion', desc0: 'No emotion' },
];

const SC_CONJUNCTIONS = [
  { key: 'because_so', label: 'because / so that' },
  { key: 'when_while', label: 'when / while' },
  { key: 'after_before', label: 'after / before' },
  { key: 'since_although', label: 'since / although / even though / however' },
  { key: 'who_which_that', label: '(noun) who / which / that' },
];

const EDC_ELEMENTS = [
  { key: 'main_idea', label: 'Main Idea (expository content)' },
  { key: 'detail1', label: 'Supporting Detail 1' },
  { key: 'detail2', label: 'Supporting Detail 2' },
];

export default function RetellScoring({ onComplete, gradeLevel }) {
  const [ndcScores, setNdcScores] = useState({});
  const [scCounts, setScCounts] = useState({});
  const [edcChecks, setEdcChecks] = useState({});
  const [vcWords, setVcWords] = useState([]);
  const [vcCustom1, setVcCustom1] = useState('');
  const [vcCustom2, setVcCustom2] = useState('');
  const [vcCustom1Checked, setVcCustom1Checked] = useState(false);
  const [vcCustom2Checked, setVcCustom2Checked] = useState(false);

  const gradeNum = parseInt(gradeLevel) || 0;
  const hasDualEpisode = gradeNum >= 3;
  const activeNDC = hasDualEpisode ? NDC_ELEMENTS : NDC_ELEMENTS.slice(0, 10);

  const totals = useMemo(() => {
    const ndcTotal = Object.values(ndcScores).reduce((s, v) => s + v, 0);
    const scTotal = Object.values(scCounts).reduce((s, v) => s + Math.min(v, 3), 0);
    const edcTotal = Object.values(edcChecks).filter(Boolean).length;
    const vcTotal = vcWords.filter(Boolean).length + (vcCustom1Checked ? 1 : 0) + (vcCustom2Checked ? 1 : 0);

    const p = (ndcScores.problem || 0) > 0 ? 1 : 0;
    const a = (ndcScores.attempt || 0) > 0 ? 1 : 0;
    const c = (ndcScores.consequence || 0) > 0 ? 1 : 0;
    const e = (ndcScores.ending || 0) > 0 ? 1 : 0;
    let ec1 = 0;
    if (p + a + c + e >= 4) ec1 = 5;
    else if (p && a && c) ec1 = 4;
    else if ((p && c && e) || (p && a && e)) ec1 = 3;
    else if ((p && a) || (p && c) || (a && c)) ec1 = 2;
    else if (p || a || c) ec1 = 1;

    let ec2 = 0;
    if (hasDualEpisode) {
      const cp = (ndcScores.complication || 0) > 0 ? 1 : 0;
      const pl2 = (ndcScores.plan2 || 0) > 0 ? 1 : 0;
      const a2 = (ndcScores.attempt2 || 0) > 0 ? 1 : 0;
      if (cp && a2 && c && e) ec2 = 5;
      else if (cp && a2 && c) ec2 = 4;
      else if ((cp && c && e) || (cp && a2 && e)) ec2 = 3;
      else if ((cp && pl2) || (cp && a2) || (cp && c)) ec2 = 2;
      else if (cp) ec2 = 1;
    }

    return {
      ndc: ndcTotal, ndcMax: activeNDC.length * 2,
      sc: scTotal, scMax: SC_CONJUNCTIONS.length * 3,
      edc: edcTotal, edcMax: 3,
      vc: vcTotal,
      ec1, ec1Max: 5,
      ec2, ec2Max: hasDualEpisode ? 5 : 0,
      total: ndcTotal + scTotal + edcTotal + vcTotal + ec1 + ec2,
    };
  }, [ndcScores, scCounts, edcChecks, vcWords, vcCustom1Checked, vcCustom2Checked, hasDualEpisode, activeNDC]);

  const submit = () => {
    onComplete({
      ndc: totals.ndc,
      sc: totals.sc,
      edc: totals.edc,
      vc: totals.vc,
      ec1: totals.ec1,
      ec2: totals.ec2,
      total: totals.total,
      details: { ndcScores, scCounts, edcChecks, vcWords, vcCustom1, vcCustom2 },
    });
  };

  return (
    <div className="space-y-6">
      {/* NDC Scoring */}
      <Section title="Narrative Discourse Complexity (NDC)" score={totals.ndc} max={totals.ndcMax}>
        <div className="space-y-2">
          {activeNDC.map(el => (
            <div key={el.key} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
              <span className="w-44 text-sm font-medium text-gray-700 flex-shrink-0">{el.label}</span>
              <div className="flex gap-1">
                {[0, 1, 2].map(v => (
                  <button key={v} onClick={() => setNdcScores(p => ({ ...p, [el.key]: v }))}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      ndcScores[el.key] === v
                        ? v === 2 ? 'bg-green-600 text-white' : v === 1 ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
                {ndcScores[el.key] === 2 ? el.desc2 : ndcScores[el.key] === 1 ? el.desc1 : el.desc0}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Episode Complexity auto-calculated */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900">Episode Complexity (auto-calculated)</p>
            <p className="text-xs text-blue-600 mt-1">Based on P + A + C + E in NDC above</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-blue-600">EC1</p>
              <p className="text-xl font-bold text-blue-900">{totals.ec1}/{totals.ec1Max}</p>
            </div>
            {hasDualEpisode && (
              <div className="text-center">
                <p className="text-xs text-blue-600">EC2</p>
                <p className="text-xl font-bold text-blue-900">{totals.ec2}/{totals.ec2Max}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expository Discourse */}
      <Section title="Expository Discourse Complexity (EDC)" score={totals.edc} max={totals.edcMax}>
        <div className="space-y-2">
          {EDC_ELEMENTS.map(el => (
            <label key={el.key} className="flex items-center gap-3 py-1 cursor-pointer">
              <input type="checkbox" checked={!!edcChecks[el.key]}
                onChange={e => setEdcChecks(p => ({ ...p, [el.key]: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">{el.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Sentence Complexity */}
      <Section title="Sentence Complexity (SC)" score={totals.sc} max={totals.scMax}>
        <p className="text-xs text-gray-500 mb-3">Count uses of each conjunction type (max 3 per type)</p>
        <div className="space-y-2">
          {SC_CONJUNCTIONS.map(c => (
            <div key={c.key} className="flex items-center gap-3 py-1">
              <span className="w-64 text-sm text-gray-700">{c.label}</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(v => (
                  <button key={v} onClick={() => setScCounts(p => ({ ...p, [c.key]: v }))}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      (scCounts[c.key] || 0) === v
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Vocabulary Complexity */}
      <Section title="Vocabulary Complexity (VC)" score={totals.vc} max="varies">
        <p className="text-xs text-gray-500 mb-3">Check each tier-2 word used by the student in their retell. Add up to 2 custom words below.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {['expertly', 'fabricated', 'expansive', 'collaborated', 'pleased', 'stolen'].map((w, i) => (
            <label key={w} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!vcWords[i]}
                onChange={e => { const next = [...vcWords]; next[i] = e.target.checked; setVcWords(next); }}
                className="rounded border-gray-300 text-blue-600" />
              <span className="text-gray-700">{w}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={vcCustom1Checked} onChange={e => setVcCustom1Checked(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <input placeholder="Custom word 1" value={vcCustom1} onChange={e => setVcCustom1(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={vcCustom2Checked} onChange={e => setVcCustom2Checked(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <input placeholder="Custom word 2" value={vcCustom2} onChange={e => setVcCustom2(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32" />
          </div>
        </div>
      </Section>

      {/* Totals & Submit */}
      <div className="bg-gray-900 text-white rounded-xl p-5">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-4">
          <TotalPill label="NDC" value={totals.ndc} max={totals.ndcMax} />
          <TotalPill label="EDC" value={totals.edc} max={totals.edcMax} />
          <TotalPill label="EC1" value={totals.ec1} max={totals.ec1Max} />
          {hasDualEpisode && <TotalPill label="EC2" value={totals.ec2} max={totals.ec2Max} />}
          <TotalPill label="SC" value={totals.sc} max={totals.scMax} />
          <TotalPill label="VC" value={totals.vc} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Retell Score</p>
            <p className="text-3xl font-bold">{totals.total}</p>
          </div>
          <button onClick={submit} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Save Retell Scores
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, score, max, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm font-medium text-blue-600">{score} / {max}</span>
      </div>
      {children}
    </div>
  );
}

function TotalPill({ label, value, max }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold">{value}{max !== undefined ? <span className="text-gray-500 text-xs">/{max}</span> : ''}</p>
    </div>
  );
}
