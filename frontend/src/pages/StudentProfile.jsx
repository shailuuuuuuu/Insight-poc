import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Award, Flame, BookOpen, TrendingUp, Star } from 'lucide-react';

const GRADIENT_COLORS = [
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
];

const BADGE_ICONS = {
  reading: BookOpen,
  streak: Flame,
  improvement: TrendingUp,
  star: Star,
  default: Award,
};

function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function getDayColor(count) {
  if (!count || count === 0) return 'bg-gray-100';
  if (count === 1) return 'bg-green-200';
  if (count === 2) return 'bg-green-400';
  return 'bg-green-600';
}

export default function StudentProfile() {
  const { studentId } = useParams();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      api.getStudentProfile(studentId),
      api.getStudentBadges(studentId),
      api.getStudentStreak(studentId),
      api.listBadges(),
    ])
      .then(([prof, earnedBdg, str, allBdg]) => {
        setProfile(prof);
        const earnedIds = new Set(earnedBdg.map(b => b.badge?.id));
        const merged = allBdg.map(b => ({
          ...b,
          earned: earnedIds.has(b.id),
          earned_at: earnedBdg.find(e => e.badge?.id === b.id)?.earned_at,
        }));
        setBadges(merged);
        setStreak(str);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-lg">Student profile not found.</p>
      </div>
    );
  }

  const gradientIdx = (profile.first_name?.charCodeAt(0) || 0) % GRADIENT_COLORS.length;
  const initials = getInitials(profile.first_name, profile.last_name);
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const last30 = streak?.last_30_days || [];

  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Avatar Section */}
      <div className={`bg-gradient-to-r ${GRADIENT_COLORS[gradientIdx]} rounded-3xl p-8 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <Star
              key={i}
              className="absolute w-6 h-6"
              style={{
                left: `${(i * 23 + 10) % 90}%`,
                top: `${(i * 17 + 5) % 80}%`,
                opacity: 0.3 + (i % 3) * 0.2,
              }}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
            <p className="text-lg text-white/80 mt-1">Grade {profile.grade}</p>
            {profile.school && (
              <p className="text-sm text-white/60">{profile.school}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reading Streak */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reading Streak</h2>
            <p className="text-sm text-gray-500">Keep the streak going!</p>
          </div>
        </div>
        <div className="flex items-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-500">{currentStreak}</div>
            <div className="text-sm text-gray-500 mt-1">Current Streak</div>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-500">{longestStreak}</div>
            <div className="text-sm text-gray-500 mt-1">Longest Streak</div>
          </div>
        </div>
        {/* 30-day heatmap */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Last 30 days</p>
          <div className="flex flex-wrap gap-1">
            {(last30.length > 0 ? last30 : Array(30).fill(0)).map((count, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded ${getDayColor(count)}`}
                title={`Day ${i + 1}: ${count || 0} activities`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>Less</span>
            <div className="w-4 h-4 rounded bg-gray-100" />
            <div className="w-4 h-4 rounded bg-green-200" />
            <div className="w-4 h-4 rounded bg-green-400" />
            <div className="w-4 h-4 rounded bg-green-600" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Badge Gallery */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Badge Gallery</h2>
            <p className="text-sm text-gray-500">{earnedBadges.length} earned · {unearnedBadges.length} remaining</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {earnedBadges.map(badge => {
            const IconComp = BADGE_ICONS[badge.category] || BADGE_ICONS.default;
            return (
              <div key={badge.id || badge.name} className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${GRADIENT_COLORS[(badge.name?.charCodeAt(0) || 0) % GRADIENT_COLORS.length]} flex items-center justify-center shadow-lg`}>
                  <IconComp className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs text-center font-medium text-gray-700 leading-tight">{badge.name}</span>
              </div>
            );
          })}
          {unearnedBadges.map(badge => (
            <div key={badge.id || badge.name} className="flex flex-col items-center gap-2 opacity-40">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <Award className="w-7 h-7 text-gray-400" />
              </div>
              <span className="text-xs text-center font-medium text-gray-400 leading-tight">{badge.name}</span>
            </div>
          ))}
          {badges.length === 0 && (
            <div className="col-span-full text-center py-6 text-gray-400">
              No badges yet — keep reading to earn your first!
            </div>
          )}
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white">
          <p className="text-sm text-white/70">Total Assessments</p>
          <p className="text-3xl font-bold mt-1">{profile.total_assessments || 0}</p>
          <p className="text-xs text-white/60 mt-2">Keep up the great work!</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-sm text-white/70">Latest Score</p>
          <p className="text-3xl font-bold mt-1">{profile.latest_score ?? '—'}</p>
          <p className="text-xs text-white/60 mt-2">{profile.latest_subtest || 'No scores yet'}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white">
          <p className="text-sm text-white/70">Improvement Areas</p>
          <p className="text-3xl font-bold mt-1">{profile.improvement_areas?.length || 0}</p>
          <p className="text-xs text-white/60 mt-2">
            {profile.improvement_areas?.length > 0
              ? `Focus: ${profile.improvement_areas[0]}`
              : "You're doing amazing!"}
          </p>
        </div>
      </div>
    </div>
  );
}
