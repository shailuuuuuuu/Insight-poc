import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Assess from './pages/Assess';
import Reports from './pages/Reports';
import UsersAdmin from './pages/UsersAdmin';
import Licenses from './pages/Licenses';
import StudentReadingMode from './pages/StudentReadingMode';
import MTSS from './pages/MTSS';
import Interventions from './pages/Interventions';
import PDHub from './pages/PDHub';
import Longitudinal from './pages/Longitudinal';
import Executive from './pages/Executive';
import TestBuilder from './pages/TestBuilder';
import Workspaces from './pages/Workspaces';
import SEL from './pages/SEL';
import Predictions from './pages/Predictions';
import ParentDashboard from './pages/ParentDashboard';
import StudentProfile from './pages/StudentProfile';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

function ParentRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'parent') return children;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/assess" element={<Assess />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<UsersAdmin />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/mtss" element={<MTSS />} />
            <Route path="/interventions" element={<Interventions />} />
            <Route path="/pd" element={<PDHub />} />
            <Route path="/analytics" element={<Longitudinal />} />
            <Route path="/executive" element={<Executive />} />
            <Route path="/test-builder" element={<TestBuilder />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/sel" element={<SEL />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/student-profile/:studentId" element={<StudentProfile />} />
          </Route>
          <Route path="/parent" element={<ParentRoute><Layout /></ParentRoute>}>
            <Route index element={<ParentDashboard />} />
          </Route>
          <Route path="/student-reading" element={<ProtectedRoute><StudentReadingMode /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
