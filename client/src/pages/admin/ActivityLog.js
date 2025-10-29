import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Clock, User, Terminal, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
    });

    const fetchLogs = useCallback(async (page = 1) => {
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
    }, [selectedRole, selectedUser]);

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
            fetchLogs(newPage);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Nhật ký hoạt động hệ thống</h1>
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

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="p-6 text-center">Đang tải...</li>
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                            <li key={log._id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-50 rounded-full">
                                            <Terminal className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                <span className="font-bold text-indigo-600">{log.user?.firstName} {log.user?.lastName}</span> đã thực hiện hành động <span className="font-semibold text-green-700">{log.action}</span>
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                                                <span className="flex items-center"><Clock size={14} className="mr-1" /> {new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                                                <span className="flex items-center"><User size={14} className="mr-1" /> {log.user?.email}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="p-6 text-center text-gray-500">Không có hoạt động nào được ghi lại.</li>
                    )}
                </ul>
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