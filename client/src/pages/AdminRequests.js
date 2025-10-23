import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Check, X, Clock, RefreshCw } from 'lucide-react';

const AdminRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/change-requests');
            setRequests(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách yêu cầu.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này?')) {
            try {
                await api.put(`/api/change-requests/${id}/approve`);
                toast.success('Yêu cầu đã được phê duyệt.');
                fetchRequests();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Lỗi khi phê duyệt.');
            }
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Nhập lý do từ chối (không bắt buộc):');
        if (reason !== null) { // User did not press Cancel
            try {
                await api.put(`/api/change-requests/${id}/reject`, { reason });
                toast.success('Yêu cầu đã bị từ chối.');
                fetchRequests();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Lỗi khi từ chối.');
            }
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { text: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' };
            case 'approved': return { text: 'Đã duyệt', color: 'bg-green-100 text-green-800' };
            case 'rejected': return { text: 'Đã từ chối', color: 'bg-red-100 text-red-800' };
            default: return { text: status, color: 'bg-gray-100 text-gray-800' };
        }
    };

    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Yêu cầu Thay đổi</h1>
                <button onClick={fetchRequests} className="p-2 rounded-full hover:bg-gray-100">
                    <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
                <label className="form-label">Lọc theo trạng thái:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field w-auto">
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Đã từ chối</option>
                    <option value="all">Tất cả</option>
                </select>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="p-6 text-center">Đang tải...</li>
                    ) : filteredRequests.length > 0 ? (
                        filteredRequests.map((req) => (
                            <li key={req._id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-indigo-600">
                                                    {req.user?.fullName} ({req.user?.studentId})
                                                </p>
                                                <p className="text-sm text-gray-700 mt-1">
                                                    Yêu cầu đổi từ trường <span className="font-semibold">{req.currentValue?.schoolName}</span>
                                                </p>
                                                <p className="text-sm text-gray-700">
                                                    sang trường <span className="font-semibold text-green-600">{req.requestedValue?.schoolName}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Ngày yêu cầu: {new Date(req.createdAt).toLocaleString('vi-VN')}
                                                </p>
                                                {req.status !== 'pending' && (
                                                    <p className="text-xs text-gray-500">
                                                        Ngày xử lý: {new Date(req.resolvedAt).toLocaleString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(req.status).color}`}>
                                                    {getStatusInfo(req.status).text}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {req.status === 'pending' && (
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button onClick={() => handleApprove(req._id)} className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200" title="Phê duyệt"><Check className="h-5 w-5" /></button>
                                            <button onClick={() => handleReject(req._id)} className="p-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200" title="Từ chối"><X className="h-5 w-5" /></button>
                                        </div>
                                    )}
                                </div>
                                {req.status === 'rejected' && req.adminNotes && (
                                    <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm"><strong>Lý do từ chối:</strong> {req.adminNotes}</div>
                                )}
                            </li>
                        ))
                    ) : (
                        <li className="p-6 text-center text-gray-500">Không có yêu cầu nào.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default AdminRequests;
