import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header'; // Import Header mới
import {
  Home,
  BookOpen,
  ClipboardList,
  User,
  Settings,
  Users,
  Calendar,
  Menu,
  X,
  Building, // Thêm icon Building
  GraduationCap,
  DoorOpen, // Thêm icon cho Phòng học
  BookCopy // Thêm icon cho Môn học
} from 'lucide-react';

// --- REFACTOR: Create a reusable NavigationMenu component ---
const NavigationMenu = ({ userRole, onLinkClick }) => {
  const location = useLocation();
  const isActive = (href) => location.pathname === href;

  // --- REFACTOR: Centralize navigation logic ---
  const getNavigation = () => {
    const baseNav = [
      { name: 'Hồ sơ', href: '/profile', icon: User },
    ];

    if (userRole === 'admin') {
      return {
        general: [
          { name: 'Dashboard', href: '/admin', icon: Home },
        ],
        admin: [
          { name: 'Quản lý người dùng', href: '/admin/users', icon: Users },
          { name: 'Quản lý giảng viên', href: '/admin/teachers', icon: GraduationCap },
          { name: 'Quản lý khóa học', href: '/admin/courses', icon: BookOpen },
          { name: 'Quản lý trường', href: '/admin/schools', icon: Building },
          { name: 'Quản lý môn học', href: '/admin/subjects', icon: BookCopy },
          { name: 'Quản lý phòng học', href: '/admin/classrooms', icon: DoorOpen },
          { name: 'Quản lý đăng ký', href: '/admin/registrations', icon: ClipboardList },
          { name: 'Quản lý học kỳ', href: '/admin/semesters', icon: Calendar },
        ]
      };
    }

    if (userRole === 'teacher') {
      return {
        general: [
          { name: 'Dashboard', href: '/teacher/dashboard', icon: Home },
          { name: 'Khóa học của tôi', href: '/admin/courses', icon: BookOpen },
          { name: 'Duyệt đăng ký', href: '/admin/registrations', icon: ClipboardList },
          ...baseNav
        ]
      };
    }

    // Default to student
    return {
      general: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Khóa học', href: '/courses', icon: BookOpen },
        { name: 'Đăng ký của tôi', href: '/my-registrations', icon: ClipboardList },
        ...baseNav
      ]
    };
  };

  const navConfig = getNavigation();

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navConfig.general?.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive(item.href)
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          onClick={onLinkClick}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.name}
        </Link>
      ))}

      {navConfig.admin && (
        <>
          <div className="pt-4 pb-2">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quản trị
            </h3>
          </div>
          {navConfig.admin.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive(item.href)
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              onClick={onLinkClick}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
};

const Layout = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">Quản lý Tín chỉ</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <NavigationMenu userRole={userRole} onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Quản lý Tín chỉ</h1>
          </div>
          <NavigationMenu userRole={userRole} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 justify-between lg:justify-end">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Header />
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 