import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalRegistrations: 0,
    pendingRegistrations: 0,
    approvedRegistrations: 0,
    activeSemesters: 0,
    pendingChangeRequests: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    database: { ok: false, message: 'Đang kiểm tra...' },
    api: { ok: false, message: 'Đang kiểm tra...' }
  });

  const fetchSystemStatus = async () => {
    try {
      const res = await api.get('/api/health/status');
      setSystemStatus(res.data);
    } catch (error) { toast.error('Không thể kiểm tra trạng thái hệ thống.'); }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [usersRes, coursesRes, registrationsRes, semestersRes, changeRequestsRes, statusRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/courses'),
        api.get('/api/registrations'),
        api.get('/api/semesters'),
        api.get('/api/change-requests'),
        api.get('/api/health/status') // Thêm API kiểm tra trạng thái
      ]);

      const users = usersRes.data.users;
      const courses = coursesRes.data.courses;
      const registrations = registrationsRes.data.registrations;
      const semesters = semestersRes.data;
      const changeRequests = changeRequestsRes.data;
      setSystemStatus(statusRes.data); // Cập nhật trạng thái hệ thống

      // Calculate stats
      const totalStudents = users.filter(u => u.role === 'student').length;
      const totalTeachers = users.filter(u => u.role === 'teacher').length;
      const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
      const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
      const activeSemesters = semesters.filter(s => s.isActive).length;
      const pendingChangeRequests = changeRequests.filter(r => r.status === 'pending').length;

      setStats({
        totalUsers: users.length,
        totalStudents,
        totalTeachers,
        totalCourses: courses.length,
        totalRegistrations: registrations.length,
        pendingRegistrations,
        approvedRegistrations,
        activeSemesters,
        pendingChangeRequests,
      });

      // Set recent data
      setRecentRegistrations(registrations.slice(0, 5));
      setRecentUsers(users.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'dropped': return 'text-gray-600 bg-gray-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'pending': return 'Chờ duyệt';
      case 'rejected': return 'Từ chối';
      case 'dropped': return 'Đã xóa';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'student': return 'Sinh viên';
      case 'teacher': return 'Giảng viên';
      case 'admin': return 'Quản trị viên';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tổng quan hệ thống và quản lý
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng người dùng</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng khóa học</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardList className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng đăng ký</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRegistrations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Học kỳ hoạt động</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeSemesters}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Phân bố người dùng</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Sinh viên</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.totalStudents}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Giảng viên</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.totalTeachers}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Quản trị viên</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.totalUsers - stats.totalStudents - stats.totalTeachers}</span>
            </div>
          </div>
        </div>

        {/* Registration Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trạng thái đăng ký</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Chờ duyệt</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.pendingRegistrations}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Đã duyệt</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.approvedRegistrations}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Hoàn thành</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalRegistrations - stats.pendingRegistrations - stats.approvedRegistrations}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Quản lý người dùng</p>
              <p className="text-xs text-gray-500">Thêm, sửa, xóa người dùng</p>
            </div>
          </Link>

          <Link
            to="/admin/courses"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-6 w-6 text-green-600 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Quản lý khóa học</p>
              <p className="text-xs text-gray-500">Tạo và chỉnh sửa khóa học</p>
            </div>
          </Link>

          <Link
            to="/admin/registrations"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClipboardList className="h-6 w-6 text-purple-600 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Quản lý đăng ký</p>
              <p className="text-xs text-gray-500">Duyệt và quản lý đăng ký</p>
            </div>
          </Link>

          <Link
            to="/admin/semesters"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-6 w-6 text-orange-600 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Quản lý học kỳ</p>
              <p className="text-xs text-gray-500">Cấu hình học kỳ mới</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Đăng ký gần đây</h3>
              <Link
                to="/admin/registrations"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentRegistrations.length > 0 ? (
              <ul className="space-y-4">
                {recentRegistrations.map((registration) => (
                  <li key={registration._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getStatusColor(registration.status)}`}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                      <p className="text-sm font-medium text-gray-900">
                        {registration.student?.firstName} {registration.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Đăng ký: {registration.course?.subject?.subjectName || 'N/A'}
                      </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(registration.status)}`}>{getStatusDisplayName(registration.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Chưa có đăng ký nào</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Người dùng gần đây</h3>
              <Link
                to="/admin/users"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentUsers.length > 0 ? (
              <ul className="space-y-4">
                {recentUsers.map((user) => (
                  <li key={user._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'teacher' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Chưa có người dùng nào</p>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Trạng thái hệ thống</h3>
          <button onClick={fetchSystemStatus} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${systemStatus.api.ok ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-700">API Services</span>
            </div>
            <span className={`text-sm font-medium ${systemStatus.api.ok ? 'text-green-600' : 'text-red-600'}`}>{systemStatus.api.message}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${systemStatus.database.ok ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-700">Cơ sở dữ liệu</span>
            </div>
            <span className={`text-sm font-medium ${systemStatus.database.ok ? 'text-green-600' : 'text-red-600'}`}>{systemStatus.database.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 