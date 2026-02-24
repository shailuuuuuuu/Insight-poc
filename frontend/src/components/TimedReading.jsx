import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function TimedReading({ passage, title, onComplete }) {
  const [phase, setPhase] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const [markedErrors, setMarkedErrors] = useState(new Set());
  const [lastWordIndex, setLastWordIndex] = useState(null);
  const [prosody, setProsody] = useState(null);
  const timerRef = useRef(null);
  const words = (passage || '').split(/\s+/).filter(Boolean);

  const start = () => {
    setPhase('running');
    setElapsed(0);
    setMarkedErrors(new Set());
    setLastWordIndex(null);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const sec = (now - startTime) / 1000;
      setElapsed(sec);
      if (sec >= 60) {
        clearInterval(timerRef.current);
        setPhase('mark_last_word');
      }
    }, 100);
  };

  const stopEarly = () => {
    clearInterval(timerRef.current);
    setPhase('mark_last_word');
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const toggleError = useCallback((idx) => {
    if (phase !== 'running' && phase !== 'mark_last_word' && phase !== 'review') return;
    setMarkedErrors(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, [phase]);

  const markLastWord = (idx) => {
    if (phase !== 'mark_last_word') return;
    setLastWordIndex(idx);
    setPhase('review');
  };

  const getResults = () => {
    const wordsRead = lastWordIndex !== null ? lastWordIndex + 1 : words.length;
    const errorsInTimeWindow = [...markedErrors].filter(i => i <= (lastWordIndex ?? words.length - 1)).length;
    const cwpm = wordsRead - errorsInTimeWindow;
    const accuracy = wordsRead > 0 ? Math.round((cwpm / wordsRead) * 100) : 0;
    return { wordsRead, errors: errorsInTimeWindow, cwpm: Math.max(0, cwpm), accuracy, prosody };
  };

  const submitResults = () => {
    const results = getResults();
    if (results.prosody === null) return;
    onComplete(results);
  };

  const results = phase === 'review' ? getResults() : null;

  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-2xl font-mono font-bold text-gray-900">
            {Math.min(60, Math.floor(elapsed))}s
          </span>
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (elapsed / 60) * 100)}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          {phase === 'ready' && (
            <button onClick={start} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Play className="w-4 h-4" /> Start Timer
            </button>
          )}
          {phase === 'running' && (
            <button onClick={stopEarly} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              <Pause className="w-4 h-4" /> Stop (1 min reached)
            </button>
          )}
          {(phase === 'mark_last_word' || phase === 'review') && (
            <button onClick={() => { setPhase('ready'); setElapsed(0); setMarkedErrors(new Set()); setLastWordIndex(null); setProsody(null); }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {phase === 'mark_last_word' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Click on the <strong>last word the student read</strong> within the 1-minute window. Also click on any words read incorrectly.
        </div>
      )}

      {/* Word passage */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {title && <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>}
        <div className="leading-8 text-lg">
          {words.map((word, i) => {
            const isError = markedErrors.has(i);
            const isLastWord = lastWordIndex === i;
            const pastLastWord = lastWordIndex !== null && i > lastWordIndex;
            return (
              <span key={i}
                onClick={() => {
                  if (phase === 'mark_last_word') markLastWord(i);
                  else toggleError(i);
                }}
                className={`
                  inline-block px-0.5 py-0.5 mx-0.5 rounded cursor-pointer select-none transition-colors
                  ${isError ? 'bg-red-200 text-red-800 line-through' : ''}
                  ${isLastWord ? 'bg-blue-200 text-blue-900 font-bold ring-2 ring-blue-400' : ''}
                  ${pastLastWord ? 'text-gray-300' : ''}
                  ${!isError && !isLastWord && !pastLastWord && phase !== 'ready' ? 'hover:bg-gray-100' : ''}
                  ${phase === 'ready' ? 'cursor-default' : ''}
                `}>
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {phase === 'review' && results && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Reading Fluency Results</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard label="Words Read" value={results.wordsRead} />
            <ResultCard label="Errors" value={results.errors} />
            <ResultCard label="CWPM" value={results.cwpm} highlight />
            <ResultCard label="Accuracy" value={`${results.accuracy}%`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prosody Rating</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 1, desc: 'Word-by-word reading. No meaningful syntax.' },
                { val: 2, desc: 'Primarily 2-word phrases. Awkward groupings.' },
                { val: 3, desc: 'Primarily 3-4 word phrases. Mostly appropriate syntax.' },
                { val: 4, desc: 'Meaningful phrases. Appropriate syntax. Expressive.' },
              ].map(p => (
                <button key={p.val} onClick={() => setProsody(p.val)}
                  className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                    prosody === p.val ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="font-bold text-lg">{p.val}</span>
                  <p className="text-xs mt-1 text-gray-600">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={submitResults} disabled={prosody === null}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Save Reading Fluency Scores
          </button>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, highlight }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
