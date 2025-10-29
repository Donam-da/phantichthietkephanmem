import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Clock, User, ChevronLeft, ChevronRight, Filter, Shield, GraduationCap, UserCircle } from 'lucide-react';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [limit] = useState(20); // Giữ limit đồng bộ với backend
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
    });

    const fetchLogs = useCallback(async (page = 1, limit = 20) => {
        const params = new URLSearchParams({ page });
        if (selectedRole && !selectedUser) params.append('role', selectedRole);
        if (selectedUser) params.append('userId', selectedUser);

        try {
            setLoading(true);
            const res = await api.get(`/api/logs?${params.toString()}`);
            setLogs(res.data.logs);
            setPagination({
                currentPage: parseInt(res.data.currentPage, 10),
                totalPages: res.data.totalPages,
            });
        } catch (error) {
            toast.error('Không thể tải nhật ký hoạt động.');
        } finally {
            setLoading(false);
        }
    }, [selectedRole, selectedUser, limit]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data.users);
        } catch (error) {
            toast.error('Không thể tải danh sách người dùng để lọc.');
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLogs(1); // Refetch logs when selectedUser changes
    }, [fetchLogs, selectedUser, selectedRole]);

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
        setSelectedUser(''); // Reset bộ lọc người dùng khi vai trò thay đổi
    };
    
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage, limit);
        }
    };

    const roleDisplay = {
        admin: { name: 'Quản trị viên', icon: <Shield size={16} className="text-red-600" />, color: 'text-red-700' },
        teacher: { name: 'Giảng viên', icon: <GraduationCap size={16} className="text-blue-600" />, color: 'text-blue-700' },
        student: { name: 'Sinh viên', icon: <UserCircle size={16} className="text-green-600" />, color: 'text-green-700' },
    };

    const actionDisplay = {
        LOGIN_SUCCESS: { text: 'Đăng nhập thành công', color: 'text-blue-600' },
        LOGOUT: { text: 'Đăng xuất', color: 'text-gray-500' },
        CHANGE_PASSWORD: { text: 'Đổi mật khẩu', color: 'text-orange-600' },
        CREATE_USER: { text: 'Tạo người dùng', color: 'text-green-600' },
        UPDATE_USER: { text: 'Cập nhật người dùng', color: 'text-yellow-600' },
        UPDATE_USER_BY_ADMIN: { text: 'Cập nhật người dùng', color: 'text-yellow-700' },
        DELETE_USER: { text: 'Xóa người dùng', color: 'text-red-600' },
        BULK_DELETE_USERS: { text: 'Xóa nhiều người dùng', color: 'text-red-700' },
        UPDATE_PROFILE: { text: 'Cập nhật hồ sơ', color: 'text-indigo-600' },
        // Các hành động liên quan đến Lớp học phần
        CREATE_COURSE: { text: 'Tạo lớp học phần', color: 'text-green-600' },
        UPDATE_COURSE: { text: 'Cập nhật lớp học phần', color: 'text-yellow-600' },
        DELETE_COURSE: { text: 'Xóa lớp học phần', color: 'text-red-600' },
        BULK_DELETE_COURSES: { text: 'Xóa nhiều lớp học phần', color: 'text-red-700' },
        // Thêm các hành động khác ở đây nếu có
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h1 className="text-2xl font-bold text-blue-700 mb-4 md:mb-0">Nhật ký hệ thống</h1>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <Filter size={16} className="text-gray-500" />
                    <div className="flex items-center gap-2">
                        <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">Vai trò:</label>
                        <select id="role-filter" value={selectedRole} onChange={handleRoleChange} className="input-field py-1.5 text-sm">
                            <option value="">Tất cả</option>
                            <option value="admin">Quản trị viên</option>
                            <option value="teacher">Giảng viên</option>
                            <option value="student">Sinh viên</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="user-filter" className="text-sm font-medium text-gray-700">Người dùng:</label>
                        <select
                            id="user-filter"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="input-field py-1.5 text-sm"
                        >
                            <option value="">Tất cả</option>
                            {users
                                .filter(user => !selectedRole || user.role === selectedRole)
                                .sort((a, b) => a.lastName.localeCompare(b.lastName)).map(user => (
                                <option key={user._id} value={user._id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-xl overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider w-16">STT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Thời gian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Vai trò</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Người dùng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="p-6 text-center text-gray-500">Đang tải...</td></tr>
                        ) : logs.length > 0 ? (
                            logs.map((log, index) => (
                                <tr key={log._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(pagination.currentPage - 1) * limit + index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center">
                                            <Clock size={14} className="mr-2 text-gray-400" />
                                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className={`flex items-center gap-2 ${roleDisplay[log.user?.role]?.color || 'text-gray-700'}`}>
                                            {roleDisplay[log.user?.role]?.icon || <User size={16} />}
                                            {roleDisplay[log.user?.role]?.name || 'Không xác định'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        {log.user?.firstName} {log.user?.lastName}
                                        <p className="text-xs text-gray-500 font-normal">{log.user?.email}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={actionDisplay[log.action]?.color || 'text-gray-800'}>{actionDisplay[log.action]?.text || log.action}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="p-6 text-center text-gray-500">Không có hoạt động nào được ghi lại.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {logs.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ChevronLeft size={16} className="inline" /> Trang trước
                    </button>
                    <span className="text-sm text-gray-700">
                        Trang {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Trang sau <ChevronRight size={16} className="inline" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityLog;