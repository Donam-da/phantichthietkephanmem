import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Header from './Header';
import {
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
  BookCopy, // Thêm icon cho Môn học
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// --- REFACTOR: Create a reusable NavigationMenu component ---
const NavigationMenu = ({ userRole, onLinkClick }) => {
  const location = useLocation();
  // --- REFACTOR: Centralize navigation logic ---
  const getNavigation = () => {
    const baseNav = [
      { name: 'Hồ sơ', href: '/profile', icon: User },
    ];

    if (userRole === 'admin') {
      return {
        general: [
          { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        ],
        collapsible: { // New structure for collapsible menu
          name: 'Quản trị',
          icon: Settings,
          items: [
            { name: 'Người dùng', href: '/admin/users', icon: Users },
            { name: 'Giảng viên', href: '/admin/teachers', icon: GraduationCap },
            { name: 'Môn học', href: '/admin/subjects', icon: BookCopy },
            { name: 'Lớp học phần', href: '/admin/courses', icon: BookOpen },
            { name: 'Học kỳ', href: '/admin/semesters', icon: Calendar },
            { name: 'Phòng học', href: '/admin/classrooms', icon: DoorOpen },
            { name: 'Trường/Khoa', href: '/admin/schools', icon: Building },
            { name: 'Đăng ký', href: '/admin/registrations', icon: ClipboardList },
          ]
        }
      };
    }

    if (userRole === 'teacher') {
      return {
        general: [
          { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
          { name: 'Khóa học của tôi', href: '/admin/courses', icon: BookOpen },
          { name: 'Duyệt đăng ký', href: '/admin/registrations', icon: ClipboardList },
        ]
      };
    }

    // Default to student
    return {
      general: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Khóa học', href: '/courses', icon: BookOpen },
        { name: 'Đăng ký của tôi', href: '/my-registrations', icon: ClipboardList },
        ...baseNav
      ]
    };
  };

  const navConfig = getNavigation();
  const { logout } = useAuth();
  const [adminMenuOpen, setAdminMenuOpen] = useState(true); // State for collapsible admin menu

  const getLinkClass = (path) => {
    const baseClass = "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200";
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return isActive
      ? `${baseClass} bg-blue-200 text-blue-800 font-semibold`
      : `${baseClass} text-gray-700 hover:bg-blue-100 hover:text-blue-800`;
  };

  // Determine if any item in the collapsible admin menu is active
  const isAnyAdminMenuItemActive = navConfig.collapsible?.items.some(item => 
    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
  );

  return (
    <div className="flex flex-col flex-grow">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navConfig.general?.map((item) => (
          <Link key={item.name} to={item.href} className={getLinkClass(item.href)} onClick={onLinkClick}>
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}

        {navConfig.collapsible && ( // Use navConfig.collapsible here
          <>
            <button 
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              className={`${getLinkClass('')} w-full flex items-center ${isAnyAdminMenuItemActive ? 'bg-blue-200 text-blue-800 font-semibold' : ''}`}
            >
              <div className="flex items-center">
                <navConfig.collapsible.icon className="mr-3 h-5 w-5" />
                {navConfig.collapsible.name}
              </div>
            </button>
            {adminMenuOpen && (
              <div className="pl-5 space-y-1 mt-1">
                {navConfig.collapsible.items.map((item) => (
                  <Link key={item.name} to={item.href} className={getLinkClass(item.href)} onClick={onLinkClick}>
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </nav>
      <div className="px-3 py-4 border-t border-blue-200">
        <Link to="/profile" className={getLinkClass('/profile')} onClick={onLinkClick}>
          <User size={20} className="mr-3" />
          <span>Hồ sơ</span>
        </Link>
        <button onClick={logout} className={`${getLinkClass('/logout')} w-full`}>
          <LogOut size={20} className="mr-3" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

const Layout = () => {
  const { isAdmin, isTeacher } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-blue-50">
          <div className="flex h-20 items-center justify-center px-4 border-b border-blue-200">
            <img className="h-10 w-auto" src="/assets/images/logo.png" alt="Hệ thống Logo" />
            <h1 className="text-2xl font-bold text-blue-800 ml-3">Hệ thống</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <NavigationMenu userRole={userRole} onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-blue-50 border-r border-gray-200">
          <div className="flex items-center justify-center h-20 border-b border-blue-200">
            <img className="h-10 w-auto" src="/assets/images/logo.png" alt="Hệ thống Logo" />
            <h1 className="text-2xl font-bold text-blue-800 ml-3">Hệ thống</h1>
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