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
  Pin, // Thêm icon Ghim
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
            { name: 'Người dùng', href: '/admin/users', icon: Users }, // 1
            { name: 'Giảng viên', href: '/admin/teachers', icon: GraduationCap }, // 2
            { name: 'Học kỳ', href: '/admin/semesters', icon: Calendar }, // 3
            { name: 'Trường/Khoa', href: '/admin/schools', icon: Building }, // 4
            { name: 'Phòng học', href: '/admin/classrooms', icon: DoorOpen }, // 5
            { name: 'Môn học', href: '/admin/subjects', icon: BookCopy }, // 6
            { name: 'Lớp học phần', href: '/admin/courses', icon: BookOpen }, // 7
            { name: 'Đăng ký', href: '/admin/registrations', icon: ClipboardList }, // 8
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
  const [adminMenuOpen, setAdminMenuOpen] = useState(false); // Trạng thái hover
  const [isAdminMenuPinned, setIsAdminMenuPinned] = useState(false); // Trạng thái ghim

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
          <div 
            onMouseEnter={() => !isAdminMenuPinned && setAdminMenuOpen(true)} 
            onMouseLeave={() => !isAdminMenuPinned && setAdminMenuOpen(false)}
          >
            <div 
              className={`${getLinkClass('')} w-full flex items-center justify-between cursor-pointer ${isAnyAdminMenuItemActive ? 'bg-blue-200 text-blue-800 font-semibold' : ''}`}
            >
              <div className="flex items-center">
                <navConfig.collapsible.icon className="mr-3 h-5 w-5" />
                {navConfig.collapsible.name}
              </div>
              <button 
                onClick={() => setIsAdminMenuPinned(!isAdminMenuPinned)} 
                className="p-1 rounded-full hover:bg-yellow-200 transition-colors"
              >
                <Pin size={16} className={`transition-transform ${isAdminMenuPinned ? 'rotate-45 text-yellow-500' : 'text-gray-500'}`} />
              </button>
            </div>
            {(adminMenuOpen || isAdminMenuPinned) && (
              <div className="pl-5 space-y-1 mt-1">
                {navConfig.collapsible.items.map((item) => (
                  <Link key={item.name} to={item.href} className={getLinkClass(item.href)} onClick={onLinkClick}>
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
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

  // ====================================================================
  // --- CẤU HÌNH HIỂN THỊ LOGO VÀ TIÊU ĐỀ TRONG SIDEBAR ---
  // ====================================================================

  // 1. Kích thước Logo
  // Sử dụng giá trị pixel tùy ý để có kích thước chính xác. Ví dụ: 'h-[64px]'
  // Các giá trị Tailwind cũ vẫn dùng được: 'h-12', 'h-14', 'h-16', 'h-20'
  const logoHeightClass = 'h-[120px]';

  // 2. Vị trí Logo (sử dụng Tailwind CSS classes)
  // top-1/2 -translate-y-1/2 để căn giữa theo chiều dọc
  // Để dùng giá trị tùy ý, sử dụng cú pháp: top-[46px] hoặc top-[2.875rem]
  // Giá trị 46px sẽ nằm giữa top-11 (44px) và top-12 (48px).
  // Bạn có thể thay đổi số 46 thành bất kỳ giá trị pixel nào bạn muốn.
  const logoTop = 'top-[1px]';
  const logoLeft = 'left-[2px]';
  const logoRight = ''; // Để trống nếu muốn căn lề trái

  // 3. Vị trí Chữ "Hệ thống" (sử dụng Tailwind CSS classes)
  // top-1/2 -translate-y-1/2 để căn giữa theo chiều dọc
  // left-24 để cách lề trái 96px (sau logo với khoảng cách hợp lý)
  // Để dùng giá trị pixel tùy ý, sử dụng cú pháp: left-[96px]
  const titleTop = 'top-1/2 -translate-y-1/2';
  const titleLeft = 'left-[120px]';
  const titleRight = ''; // Để trống nếu muốn căn lề trái

  // ====================================================================
  // --- KẾT THÚC CẤU HÌNH ---
  // ====================================================================

  const userRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';

  // Xác định đường dẫn dashboard dựa trên vai trò người dùng
  const getDashboardPath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher/dashboard';
    return '/dashboard';
  };
  const dashboardPath = getDashboardPath(userRole);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-blue-50">
          <Link to={dashboardPath} className="block">
            <div className="relative h-20 px-4 border-b border-blue-200">
              <img 
                className={`absolute ${logoHeightClass} ${logoTop} ${logoLeft} ${logoRight} w-auto`} 
                src="/assets/images/logo.png" 
                alt="Hệ thống Logo" />
              <h1 className={`absolute text-2xl font-bold text-blue-800 ${titleTop} ${titleLeft} ${titleRight}`}>Hệ thống</h1>
              {/* Nút đóng sidebar (X) cũng được định vị tuyệt đối */}
              <button onClick={(e) => { e.preventDefault(); setSidebarOpen(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200">
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
          </Link>
          <NavigationMenu userRole={userRole} onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-blue-50 border-r border-gray-200">
          <Link to={dashboardPath} className="block">
            <div className="relative h-20 border-b border-blue-200">
              <img 
                className={`absolute ${logoHeightClass} ${logoTop} ${logoLeft} ${logoRight} w-auto`} 
                src="/assets/images/logo.png" 
                alt="Hệ thống Logo" />
              <h1 className={`absolute text-2xl font-bold text-blue-800 ${titleTop} ${titleLeft} ${titleRight}`}>Hệ thống</h1>
            </div>
          </Link>
          <NavigationMenu userRole={userRole} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-blue-200 bg-blue-50 px-4 sm:gap-x-6 sm:px-6 lg:px-8 justify-between lg:justify-end">
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