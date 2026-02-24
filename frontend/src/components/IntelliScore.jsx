import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Mic, Square, Play, Pause, Upload, Wand2, FileText, BarChart3, Loader2 } from 'lucide-react';

const RECORDING_STATES = { IDLE: 'idle', RECORDING: 'recording', PAUSED: 'paused' };

export default function IntelliScore({ sessionId, onScoresReady }) {
  const [recState, setRecState] = useState(RECORDING_STATES.IDLE);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('record');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setRecState(RECORDING_STATES.RECORDING);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setRecState(RECORDING_STATES.IDLE);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleUploadAndTranscribe = async () => {
    if (!audioBlob) return;
    setError('');
    setUploading(true);
    try {
      await api.uploadAudio(sessionId, audioBlob);
      setUploaded(true);
      setUploading(false);

      setTranscribing(true);
      const res = await api.transcribeAudio(sessionId);
      setTranscript(res.transcript);
      setTranscribing(false);
      setTab('transcript');
    } catch (err) {
      setError(err.message);
      setUploading(false);
      setTranscribing(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!transcript.trim()) return;
    setError('');
    try {
      await api.setTranscript(sessionId, transcript);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setError('Please enter or generate a transcript first.');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      await api.setTranscript(sessionId, transcript);
      const result = await api.analyzeTranscript(sessionId);
      setAnalysis(result);
      setTab('analysis');
      if (onScoresReady && result.sub_scores) {
        onScoresReady(result);
      }
    } catch (err) {
      setError(err.message);
    }
    setAnalyzing(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <Wand2 className="w-5 h-5 text-white" />
          <div>
            <h3 className="text-white font-semibold">IntelliScore</h3>
            <p className="text-purple-200 text-xs">AI-Powered Narrative Analysis</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'record', label: 'Record', icon: Mic },
          { id: 'transcript', label: 'Transcript', icon: FileText },
          { id: 'analysis', label: 'Analysis', icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>
        )}

        {/* Record Tab */}
        {tab === 'record' && (
          <div className="space-y-6">
            <div className="text-center">
              {recState === RECORDING_STATES.IDLE && !audioBlob && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Record the student's oral narrative retell. The audio will be transcribed and analyzed for narrative complexity.
                  </p>
                  <button
                    onClick={startRecording}
                    className="mx-auto w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                  <p className="text-xs text-gray-400">Click to start recording</p>
                </div>
              )}

              {recState === RECORDING_STATES.RECORDING && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-600 font-medium">Recording</span>
                    <span className="text-gray-500 font-mono">{formatTime(duration)}</span>
                  </div>

                  <div className="flex justify-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-red-400 rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 24 + 8}px`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={stopRecording}
                    className="mx-auto w-16 h-16 bg-gray-800 hover:bg-gray-900 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <Square className="w-6 h-6 text-white" />
                  </button>
                  <p className="text-xs text-gray-400">Click to stop</p>
                </div>
              )}

              {recState === RECORDING_STATES.IDLE && audioBlob && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={togglePlayback}
                        className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        )}
                      </button>
                      <div className="text-sm text-gray-600">
                        Recording: {formatTime(duration)}
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        hidden
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => { setAudioBlob(null); setAudioUrl(null); setUploaded(false); }}
                      className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={handleUploadAndTranscribe}
                      disabled={uploading || transcribing}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : transcribing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Transcribing...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Upload & Transcribe</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {tab === 'transcript' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Edit the transcript below or type one manually. The transcript will be analyzed for narrative language measures.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Type or paste the student's narrative retell transcript here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {transcript.split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTranscript}
                  disabled={!transcript.trim()}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Save Transcript
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!transcript.trim() || analyzing}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Analyze with IntelliScore</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            {!analysis ? (
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No analysis yet. Record or type a transcript, then click "Analyze with IntelliScore".</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{analysis.word_count}</p>
                    <p className="text-xs text-purple-500">Words</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{analysis.sentence_count}</p>
                    <p className="text-xs text-purple-500">Sentences</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">
                      {analysis.total_retell_score}/{analysis.max_retell_score}
                    </p>
                    <p className="text-xs text-purple-500">Retell Score</p>
                  </div>
                </div>

                {/* Sub-scores */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Narrative Language Measures</h4>
                  {Object.entries(analysis.sub_scores).map(([key, data]) => (
                    <div key={key} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{data.label}</span>
                          <span className="text-xs text-gray-400 ml-2">({key})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(data.max)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                i < data.score
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                          <span className="text-sm font-bold text-gray-700 ml-2">
                            {data.score}/{data.max}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{data.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-xs text-purple-700">
                    <strong>Note:</strong> These scores are generated by a heuristic analysis engine. The production IntelliScore uses
                    a proprietary NLP model trained on thousands of scored retells for more accurate results.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
