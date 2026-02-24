import { useState, useMemo } from 'react';

const FACTUAL_QUESTIONS = [
  'Who was the main character?',
  'Where was the character?',
  'What was the problem?',
  'How did the character feel about the problem?',
  'What did the character do to solve the problem?',
  'How did the story end?',
  'What did you learn? (expository)',
];

const IV_ITEMS = [
  { word: 'Word 1', questionA: 'What does this word mean?', questionB: 'Does it mean ___ or ___?' },
  { word: 'Word 2', questionA: 'What does this word mean?', questionB: 'Does it mean ___ or ___?' },
  { word: 'Word 3', questionA: 'What does this word mean?', questionB: 'Does it mean ___ or ___?' },
];

const IR_QUESTIONS = [
  { type: 'text', label: 'Text-Based Inference 1', question: 'Why do you think the character did that?' },
  { type: 'text', label: 'Text-Based Inference 2', question: 'What might happen next based on the story?' },
  { type: 'elaborative', label: 'Elaborative Inference', question: 'Using what you know, why might this be true?' },
];

export default function QuestionsScoring({ onComplete }) {
  const [factualScores, setFactualScores] = useState({});
  const [ivScores, setIvScores] = useState({});
  const [irMainScores, setIrMainScores] = useState({});
  const [irWhyScores, setIrWhyScores] = useState({});

  const totals = useMemo(() => {
    const factualTotal = Object.values(factualScores).reduce((s, v) => s + v, 0);
    const ivTotal = Object.values(ivScores).reduce((s, v) => s + v, 0);
    const irMainTotal = Object.values(irMainScores).reduce((s, v) => s + v, 0);
    const irWhyTotal = Object.values(irWhyScores).reduce((s, v) => s + v, 0);
    return {
      factual: factualTotal, factualMax: FACTUAL_QUESTIONS.length * 2,
      iv: ivTotal, ivMax: IV_ITEMS.length * 3,
      ir: irMainTotal + irWhyTotal, irMax: IR_QUESTIONS.length * 3,
      total: factualTotal + ivTotal + irMainTotal + irWhyTotal,
    };
  }, [factualScores, ivScores, irMainScores, irWhyScores]);

  const submit = () => {
    onComplete({
      factual: totals.factual,
      iv: totals.iv,
      ir: totals.ir,
      total: totals.total,
    });
  };

  return (
    <div className="space-y-6">
      {/* Factual */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Factual Questions (F)</h3>
          <span className="text-sm font-medium text-blue-600">{totals.factual} / {totals.factualMax}</span>
        </div>
        <div className="space-y-2">
          {FACTUAL_QUESTIONS.map((q, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="flex-1 text-sm text-gray-700">{q}</span>
              <div className="flex gap-1">
                {[0, 1, 2].map(v => (
                  <button key={v} onClick={() => setFactualScores(p => ({ ...p, [i]: v }))}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      factualScores[i] === v
                        ? v === 2 ? 'bg-green-600 text-white' : v === 1 ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inferential Vocabulary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Inferential Vocabulary (IV)</h3>
          <span className="text-sm font-medium text-blue-600">{totals.iv} / {totals.ivMax}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Ask Question A first. If correct: 3=clear & complete, 2=unclear/incomplete. If incorrect on A, ask Question B: 1=correct, 0=incorrect.
        </p>
        <div className="space-y-3">
          {IV_ITEMS.map((item, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">{item.word}</p>
              <div className="flex gap-1">
                {[
                  { v: 3, label: '3 (A: Complete)' },
                  { v: 2, label: '2 (A: Partial)' },
                  { v: 1, label: '1 (B: Correct)' },
                  { v: 0, label: '0 (Incorrect)' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setIvScores(p => ({ ...p, [i]: opt.v }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      ivScores[i] === opt.v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inferential Reasoning */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Inferential Reasoning (IR)</h3>
          <span className="text-sm font-medium text-blue-600">{totals.ir} / {totals.irMax}</span>
        </div>
        <div className="space-y-3">
          {IR_QUESTIONS.map((q, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">{q.label}</p>
              <p className="text-xs text-gray-500 mb-2">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Main (0-2)</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(v => (
                      <button key={v} onClick={() => setIrMainScores(p => ({ ...p, [i]: v }))}
                        className={`w-8 h-8 rounded text-xs font-medium ${
                          irMainScores[i] === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}>{v}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">"Why?" (0-1)</p>
                  <div className="flex gap-1">
                    {[0, 1].map(v => (
                      <button key={v} onClick={() => setIrWhyScores(p => ({ ...p, [i]: v }))}
                        className={`w-8 h-8 rounded text-xs font-medium ${
                          irWhyScores[i] === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-900 text-white rounded-xl p-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Factual</p>
            <p className="text-lg font-bold">{totals.factual}<span className="text-gray-500 text-xs">/{totals.factualMax}</span></p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Inferential Vocab</p>
            <p className="text-lg font-bold">{totals.iv}<span className="text-gray-500 text-xs">/{totals.ivMax}</span></p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Inferential Reasoning</p>
            <p className="text-lg font-bold">{totals.ir}<span className="text-gray-500 text-xs">/{totals.irMax}</span></p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total NLM Questions Score</p>
            <p className="text-3xl font-bold">{totals.total}</p>
          </div>
          <button onClick={submit} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Save Questions Scores
          </button>
        </div>
      </div>
    </div>
  );
}
