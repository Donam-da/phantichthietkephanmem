import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, ChevronDown } from 'lucide-react';
import api from '../services/api';

const Header = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [pendingRequests, setPendingRequests] = useState(0);

    useEffect(() => {
        const fetchPendingRequests = async () => {
            if (isAdmin) {
                try {
                    const res = await api.get('/api/change-requests');
                    const pendingCount = res.data.filter(req => req.status === 'pending').length;
                    setPendingRequests(pendingCount);
                } catch (error) {
                    console.error("Failed to fetch pending requests", error);
                }
            }
        };

        fetchPendingRequests();
        // Optional: Set up an interval to poll for new requests
        const interval = setInterval(fetchPendingRequests, 60000); // every 60 seconds

        return () => clearInterval(interval);
    }, [isAdmin]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-end items-center h-16">
                    <div className="flex items-center space-x-4">
                        {isAdmin && (
                            <Link to="/admin/requests" className="relative p-2 rounded-full text-yellow-500 hover:bg-yellow-100 hover:text-yellow-600 transition-colors">
                                <Bell className="h-6 w-6" fill="currentColor" />
                                {pendingRequests > 0 && (
                                    <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                                )}
                            </Link>
                        )}

                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                <img
                                    className="h-8 w-8 rounded-full object-cover"
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`}
                                    alt="User avatar"
                                />
                                <span>{user?.firstName} {user?.lastName}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="user-menu-button"
                                >
                                    <Link
                                        to="/profile"
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Hồ sơ
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;