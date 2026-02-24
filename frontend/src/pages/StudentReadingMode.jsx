import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentReadingMode() {
  const [searchParams] = useSearchParams();
  const grade = searchParams.get('grade') || '1';
  const toy = searchParams.get('toy') || 'BOY';
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(22);

  useEffect(() => {
    setLoading(true);
    api.getStories(grade, toy)
      .then((res) => {
        const stories = res?.stories || [];
        setStory(stories.length > 0 ? stories[0] : null);
      })
      .catch(() => setStory(null))
      .finally(() => setLoading(false));
  }, [grade, toy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 text-xl">No story available for Grade {grade}, {toy}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 right-0 p-3 flex gap-2 z-10 print:hidden">
        <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="w-8 h-8 bg-gray-100 rounded text-gray-700 font-bold hover:bg-gray-200">A-</button>
        <button onClick={() => setFontSize(s => Math.min(40, s + 2))} className="w-8 h-8 bg-gray-100 rounded text-gray-700 font-bold hover:bg-gray-200">A+</button>
        <button onClick={() => window.print()} className="px-3 py-1 bg-gray-100 rounded text-gray-700 text-sm font-medium hover:bg-gray-200">Print</button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-center text-gray-800 font-semibold mb-8" style={{ fontSize: fontSize + 4 }}>
          {story.title}
        </h1>
        <p className="text-gray-900 leading-relaxed" style={{ fontSize, lineHeight: '1.8' }}>
          {story.text}
        </p>
      </div>
    </div>
  );
}
