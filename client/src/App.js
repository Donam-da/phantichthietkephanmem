import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import MyRegistrations from './pages/MyRegistrations';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import CourseManagement from './pages/CourseManagement';
import RegistrationManagement from './pages/RegistrationManagement';
import ManageSchools from './pages/admin/ManageSchools';
import ManageTeachers from './pages/admin/ManageTeachers'; // Thêm import
import ManageClassrooms from './pages/admin/ManageClassrooms'; // Thêm import
import ManageSubjects from './pages/admin/ManageSubjects'; // Thêm import
import AdminRequests from './pages/AdminRequests'; // Đổi tên và đường dẫn
import SemesterManagement from './pages/SemesterManagement';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherCourses from './pages/TeacherCourses';
import TeacherCourseDetail from './pages/TeacherCourseDetail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div>Loading...</div>; // Or a spinner
  return isAdmin ? children : <Navigate to="/dashboard" />;
};

// Teacher or Admin Route Component
const StaffRoute = ({ children }) => {
  const { isAdmin, isTeacher, loading } = useAuth();
  if (loading) return <div>Loading...</div>; // Or a spinner
  return (isAdmin || isTeacher) ? children : <Navigate to="/dashboard" />;
};

// Main App Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="my-registrations" element={<MyRegistrations />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Teacher Routes */}
        <Route path="teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="teacher/courses" element={<TeacherCourses />} />
        <Route path="teacher/courses/:id" element={<TeacherCourseDetail />} />

        {/* Admin Routes */}
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} /> 
        <Route path="admin/courses" element={<StaffRoute><CourseManagement /></StaffRoute>} />
        <Route path="admin/registrations" element={<StaffRoute><RegistrationManagement /></StaffRoute>} />
        <Route path="admin/schools" element={<AdminRoute><ManageSchools /></AdminRoute>} />
        <Route path="admin/teachers" element={<AdminRoute><ManageTeachers /></AdminRoute>} />
        <Route path="admin/subjects" element={<AdminRoute><ManageSubjects /></AdminRoute>} />
        <Route path="admin/classrooms" element={<AdminRoute><ManageClassrooms /></AdminRoute>} />
        <Route path="admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
        <Route path="admin/semesters" element={<AdminRoute><SemesterManagement /></AdminRoute>} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// App Component with Context
const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App; 