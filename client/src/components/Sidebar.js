import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  User,
  LogOut,
  BookCopy,
  School,
  GitPullRequest,
  BookUser
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const location = useLocation();

  const getLinkClass = (path) => {
    const baseClass = "flex items-center p-3 my-1 rounded-lg transition-colors duration-200";
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return isActive
      ? `${baseClass} bg-blue-200 text-blue-800 font-semibold`
      : `${baseClass} text-gray-600 hover:bg-blue-100 hover:text-blue-700`;
  };

  const adminLinks = [
    { to: '/admin', icon: <LayoutDashboard size={20} />, text: 'Dashboard' },
    { to: '/admin/users', icon: <Users size={20} />, text: 'Người dùng' },
    { to: '/admin/subjects', icon: <BookCopy size={20} />, text: 'Môn học' },
    { to: '/admin/courses', icon: <BookOpen size={20} />, text: 'Lớp học phần' },
    { to: '/admin/semesters', icon: <Calendar size={20} />, text: 'Học kỳ' },
    { to: '/admin/classrooms', icon: <School size={20} />, text: 'Phòng học' },
    { to: '/admin/registrations', icon: <ClipboardList size={20} />, text: 'Đăng ký' },
    { to: '/admin/requests', icon: <GitPullRequest size={20} />, text: 'Yêu cầu' },
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', icon: <LayoutDashboard size={20} />, text: 'Dashboard' },
    { to: '/teacher/courses', icon: <BookOpen size={20} />, text: 'Lớp học của tôi' },
    { to: '/admin/registrations', icon: <ClipboardList size={20} />, text: 'Duyệt đăng ký' },
  ];

  const studentLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, text: 'Bảng điều khiển' },
    { to: '/courses', icon: <BookOpen size={20} />, text: 'Đăng ký học phần' },
    { to: '/my-registrations', icon: <ClipboardList size={20} />, text: 'Lớp đã đăng ký' },
  ];

  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : studentLinks;

  return (
    <div className="h-screen flex flex-col bg-blue-50 border-r border-gray-200 w-64">
      <div className="flex items-center justify-center h-20 border-b border-gray-200">
        <div className="bg-blue-600 p-3 rounded-lg">
          <BookUser className="text-white" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-blue-800 ml-3">Hệ thống</h1>
      </div>

      <nav className="flex-grow px-4 py-4">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={getLinkClass(link.to)}>
            <span className="mr-4">{link.icon}</span>
            <span>{link.text}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <NavLink to="/profile" className={getLinkClass('/profile')}>
          <User size={20} className="mr-4" />
          <span>Hồ sơ</span>
        </NavLink>
        <button
          onClick={logout}
          className={`${getLinkClass('/logout')} w-full`}
        >
          <LogOut size={20} className="mr-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;