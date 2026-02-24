import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ChevronDown, ChevronRight, CheckCircle, Circle, Award, Printer } from 'lucide-react';

export default function PDHub() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [completing, setCompleting] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getMyPDProgress(), api.listPDCourses()])
      .then(([prog, crs]) => {
        setProgress(prog);
        setCourses(crs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    try {
      const [prog, crs] = await Promise.all([api.getMyPDProgress(), api.listPDCourses()]);
      setProgress(prog);
      setCourses(crs);
      if (selectedCourse) {
        const updated = crs.find((c) => c.id === selectedCourse.id);
        if (updated) setSelectedCourse(updated);
      }
    } catch {}
  };

  const handleCompleteModule = async (moduleId) => {
    setCompleting(moduleId);
    try {
      const quiz = getModuleQuiz(moduleId);
      let score = null;
      if (quiz) {
        const answers = quizAnswers[moduleId] || {};
        let correct = 0;
        quiz.forEach((q) => {
          if (answers[q.id] === q.correct) correct++;
        });
        score = Math.round((correct / quiz.length) * 100);
      }
      await api.completePDModule(moduleId, score);
      await refresh();
    } catch {}
    setCompleting(null);
  };

  const getModuleQuiz = (moduleId) => {
    if (!selectedCourse) return null;
    const mod = (selectedCourse.modules || []).find((m) => m.id === moduleId);
    if (!mod || !mod.quiz_json) return null;
    try {
      return typeof mod.quiz_json === 'string' ? JSON.parse(mod.quiz_json) : mod.quiz_json;
    } catch {
      return null;
    }
  };

  const isModuleCompleted = (moduleId) => {
    if (!selectedCourse) return false;
    const mod = (selectedCourse.modules || []).find((m) => m.id === moduleId);
    return mod?.completed || false;
  };

  const allModulesCompleted = selectedCourse
    ? (selectedCourse.modules || []).every((m) => m.completed)
    : false;

  const handlePrint = () => {
    if (certRef.current) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Certificate</title>
        <style>
          body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Georgia, serif; }
          .cert { border: 8px double #1e40af; padding: 60px; text-align: center; max-width: 700px; }
          .cert h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
          .cert h2 { font-size: 22px; margin: 20px 0 4px; }
          .cert p { font-size: 14px; color: #555; margin: 6px 0; }
          .cert .name { font-size: 26px; font-weight: bold; color: #111; margin: 16px 0; }
        </style></head><body>${certRef.current.innerHTML}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const totalModules = progress?.total_modules || 0;
  const completedModules = progress?.completed_modules || 0;
  const completedCourses = progress?.completed_courses || 0;
  const pctComplete = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Professional Development Hub</h1>
          <p className="text-sm text-gray-500">Build your skills with evidence-based training modules</p>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-80">My Progress</p>
            <p className="text-3xl font-bold">{completedModules}/{totalModules} modules</p>
            <p className="text-sm opacity-80 mt-1">{completedCourses} course{completedCourses !== 1 ? 's' : ''} completed</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{pctComplete}% complete</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${pctComplete}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedCourse ? (
        /* Course Viewer */
        <div className="space-y-4">
          <button
            onClick={() => { setSelectedCourse(null); setExpandedModule(null); setQuizAnswers({}); }}
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            ← Back to Courses
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedCourse.title}</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedCourse.description}</p>

            {/* Course progress */}
            {(() => {
              const modules = selectedCourse.modules || [];
              const done = modules.filter((m) => m.completed).length;
              const coursePct = modules.length > 0 ? Math.round((done / modules.length) * 100) : 0;
              return (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{done}/{modules.length} modules completed</span>
                    <span>{coursePct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${coursePct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Modules Accordion */}
            <div className="space-y-2">
              {(selectedCourse.modules || []).map((mod, idx) => {
                const isExpanded = expandedModule === mod.id;
                const completed = isModuleCompleted(mod.id);
                const quiz = getModuleQuiz(mod.id);

                return (
                  <div key={mod.id} className={`border rounded-lg ${completed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      {completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`flex-1 text-sm font-medium ${completed ? 'text-green-700' : 'text-gray-900'}`}>
                        Module {idx + 1}: {mod.title}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="pl-8">
                          <p className="text-sm text-gray-600 whitespace-pre-line">{mod.content}</p>
                        </div>

                        {quiz && quiz.length > 0 && (
                          <div className="pl-8 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">Quiz</h4>
                            {quiz.map((q) => (
                              <div key={q.id} className="space-y-2">
                                <p className="text-sm text-gray-700 font-medium">{q.question}</p>
                                <div className="space-y-1">
                                  {(q.options || []).map((opt, oi) => {
                                    const selected = (quizAnswers[mod.id] || {})[q.id] === oi;
                                    return (
                                      <label
                                        key={oi}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                                          selected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`quiz-${mod.id}-${q.id}`}
                                          checked={selected}
                                          onChange={() =>
                                            setQuizAnswers((prev) => ({
                                              ...prev,
                                              [mod.id]: { ...(prev[mod.id] || {}), [q.id]: oi },
                                            }))
                                          }
                                          className="accent-primary-600"
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!completed && (
                          <div className="pl-8">
                            <button
                              onClick={() => handleCompleteModule(mod.id)}
                              disabled={completing === mod.id}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                              {completing === mod.id ? 'Completing…' : 'Complete Module'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Certificate Section */}
            {allModulesCompleted && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Award className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-green-800 mb-1">Course Complete!</h3>
                <p className="text-sm text-green-700 mb-4">
                  You have completed all modules in {selectedCourse.title}.
                </p>
                <button
                  onClick={() => setShowCertificate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Award className="w-4 h-4" /> View Certificate
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Course Catalog */
        <div>
          {courses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              No courses available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map((course) => {
                const modules = course.modules || [];
                const done = modules.filter((m) => m.completed).length;
                const coursePct = modules.length > 0 ? Math.round((done / modules.length) * 100) : 0;
                const isComplete = done === modules.length && modules.length > 0;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      {course.duration && <span>{course.duration}</span>}
                      <span>{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{done}/{modules.length}</span>
                        <span>{coursePct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary-600'}`}
                          style={{ width: `${coursePct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedCourse(course); setExpandedModule(null); setQuizAnswers({}); }}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isComplete
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : done > 0
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isComplete ? 'Review' : done > 0 ? 'Continue' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Certificate of Completion</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div ref={certRef}>
              <div className="cert border-4 border-double border-primary-700 rounded-lg p-12 text-center">
                <h1 className="text-2xl font-bold text-primary-700 mb-2">Certificate of Completion</h1>
                <p className="text-sm text-gray-500 mb-6">This certifies that</p>
                <p className="text-2xl font-bold text-gray-900 mb-6">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-sm text-gray-500 mb-2">has successfully completed</p>
                <p className="text-xl font-semibold text-gray-900 mb-6">{selectedCourse.title}</p>
                <p className="text-sm text-gray-500">
                  Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {progress?.average_score != null && (
                  <p className="text-sm text-gray-500 mt-1">Average Score: {progress.average_score}%</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
