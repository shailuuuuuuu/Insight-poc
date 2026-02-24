import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Play, Pause, Clock } from 'lucide-react';

export function DDMGridScoring({ target, timeLimit = 60, onComplete }) {
  const [grid, setGrid] = useState(null);
  const [phase, setPhase] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const [marked, setMarked] = useState(new Set());
  const [lastIndex, setLastIndex] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getDdmGrid(target).then(setGrid).catch(() => {});
  }, [target]);

  const allItems = grid?.data?.flat() || [];

  const start = () => {
    setPhase('running');
    setElapsed(0);
    setMarked(new Set());
    setLastIndex(null);
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      if (s >= timeLimit) { clearInterval(timerRef.current); setPhase('mark_last'); }
    }, 100);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const stop = () => { clearInterval(timerRef.current); setPhase('mark_last'); };

  const handleClick = (flatIdx) => {
    if (phase === 'mark_last') { setLastIndex(flatIdx); setPhase('review'); return; }
    if (phase !== 'running' && phase !== 'review') return;
    setMarked(p => { const n = new Set(p); if (n.has(flatIdx)) n.delete(flatIdx); else n.add(flatIdx); return n; });
  };

  const getScore = () => {
    const total = lastIndex !== null ? lastIndex + 1 : allItems.length;
    const errors = [...marked].filter(i => i <= (lastIndex ?? allItems.length - 1)).length;
    return Math.max(0, total - errors);
  };

  if (!grid) return <div className="p-4 text-gray-400">Loading grid...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-2xl font-mono font-bold">{Math.min(timeLimit, Math.floor(elapsed))}s / {timeLimit}s</span>
        </div>
        <div className="flex gap-2">
          {phase === 'ready' && <button onClick={start} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Play className="w-4 h-4 inline mr-1" />Start</button>}
          {phase === 'running' && <button onClick={stop} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"><Pause className="w-4 h-4 inline mr-1" />Stop</button>}
        </div>
      </div>

      {phase === 'mark_last' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Click the <strong>last item attempted</strong>. Click incorrect items to mark errors.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${grid.data[0]?.length || 8}, minmax(0, 1fr))` }}>
          {allItems.map((item, idx) => {
            const isError = marked.has(idx);
            const isLast = lastIndex === idx;
            const past = lastIndex !== null && idx > lastIndex;
            return (
              <button key={idx} onClick={() => handleClick(idx)}
                className={`p-2 rounded text-center text-lg font-medium transition-colors border ${
                  isError ? 'bg-red-100 text-red-700 border-red-300 line-through' :
                  isLast ? 'bg-blue-100 text-blue-800 border-blue-400 ring-2 ring-blue-400' :
                  past ? 'bg-gray-50 text-gray-300 border-gray-100' :
                  phase !== 'ready' ? 'hover:bg-gray-100 border-gray-200 cursor-pointer' : 'border-gray-200 cursor-default'
                }`}>
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {phase === 'review' && (
        <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Score (items correct in {timeLimit}s)</p>
            <p className="text-3xl font-bold">{getScore()}</p>
          </div>
          <button onClick={() => onComplete({ score: getScore(), errors: marked.size })}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Score</button>
        </div>
      )}
    </div>
  );
}

export function DDMWordListScoring({ target, onComplete }) {
  const [wordData, setWordData] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    api.getDdmGrid(target).then(setWordData).catch(() => {});
  }, [target]);

  const words = wordData?.data || [];
  if (typeof words === 'string') {
    return <DDMPassageScoring passage={words} target={target} onComplete={onComplete} />;
  }

  const total = Object.values(scores).filter(v => v === 1).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Decoding Inventory: {target.replace(/_/g, ' ')}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {words.map((word, i) => (
            <button key={i} onClick={() => setScores(p => ({ ...p, [i]: p[i] === 1 ? 0 : 1 }))}
              className={`p-3 rounded-lg text-center font-mono text-lg border transition-colors ${
                scores[i] === 1 ? 'bg-green-100 border-green-400 text-green-800' :
                scores[i] === 0 ? 'bg-red-100 border-red-300 text-red-700 line-through' :
                'border-gray-200 hover:bg-gray-50'
              }`}>
              {word}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">Click words to mark correct (green) or click again for incorrect (red).</p>
      </div>

      <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Score</p>
          <p className="text-3xl font-bold">{total} / {words.length}</p>
        </div>
        <button onClick={() => onComplete({ score: total, max: words.length })}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Score</button>
      </div>
    </div>
  );
}

function DDMPassageScoring({ passage, target, onComplete }) {
  const words = passage.split(/\s+/);
  const [marked, setMarked] = useState(new Set());

  const targetWords = ['stodrun', 'goupaik', 'lirparg', 'kighdost', 'ungobers', 'bimudgeic', 'poughnigild', 'grombacent', 'lirmarves', 'Tembog'];
  const targetIndices = [];
  words.forEach((w, i) => {
    if (targetWords.some(tw => w.toLowerCase().includes(tw.toLowerCase()))) targetIndices.push(i);
  });

  const toggle = (i) => setMarked(p => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const score = targetIndices.filter(i => marked.has(i)).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Multisyllabic Words in Context</h3>
        <div className="leading-8 text-base">
          {words.map((w, i) => {
            const isTarget = targetIndices.includes(i);
            const isMarked = marked.has(i);
            return (
              <span key={i} onClick={() => isTarget && toggle(i)}
                className={`inline-block px-0.5 mx-0.5 rounded transition-colors ${
                  isTarget ? (isMarked ? 'bg-green-200 text-green-800 font-bold cursor-pointer' : 'bg-amber-100 cursor-pointer hover:bg-amber-200 font-medium') : ''
                }`}>{w}</span>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">Click highlighted nonsense words to mark as correctly read.</p>
      </div>

      <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Words in Context Score</p>
          <p className="text-3xl font-bold">{score} / {targetIndices.length}</p>
        </div>
        <button onClick={() => onComplete({ score, max: targetIndices.length })}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Score</button>
      </div>
    </div>
  );
}

export function DDMPhonemeScoring({ target, items, maxPerItem = 1, onComplete }) {
  const [scores, setScores] = useState({});

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxTotal = items.length * maxPerItem;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{target.replace(/_/g, ' ')}</h3>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="w-32 text-sm font-mono text-gray-700">{typeof item === 'string' ? item : item.prompt}</span>
              {typeof item !== 'string' && item.answer && <span className="text-xs text-gray-400">({item.answer})</span>}
              <div className="flex gap-1 ml-auto">
                {Array.from({ length: maxPerItem + 1 }, (_, v) => (
                  <button key={v} onClick={() => setScores(p => ({ ...p, [i]: v }))}
                    className={`w-8 h-8 rounded text-xs font-medium ${
                      scores[i] === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Score</p>
          <p className="text-3xl font-bold">{total} / {maxTotal}</p>
        </div>
        <button onClick={() => onComplete({ score: total, max: maxTotal })}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Score</button>
      </div>
    </div>
  );
}
