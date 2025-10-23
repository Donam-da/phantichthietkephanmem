import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Users, User, Mail, Hash, Check, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TeacherCourseDetail = () => {
    const { id: courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchCourseDetails = useCallback(async () => {
        try {
            setLoading(true);
            const [courseRes, registrationsRes] = await Promise.all([
                api.get(`/api/courses/${courseId}`),
                api.get(`/api/registrations?course=${courseId}`)
            ]);
            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data.registrations);
            setFilteredRegistrations(registrationsRes.data.registrations);
        } catch (error) {
            console.error('Error fetching course details:', error);
            toast.error('Không thể tải thông tin chi tiết khóa học. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourseDetails();
    }, [fetchCourseDetails]);

    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredRegistrations(registrations);
        } else {
            setFilteredRegistrations(
                registrations.filter(r => r.status === statusFilter)
            );
        }
    }, [statusFilter, registrations]);

    const getStatusColor = useCallback((status) => {
        switch (status) {
            case 'approved': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'rejected': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    }, []);

    const getStatusDisplayName = useCallback((status) => {
        switch (status) {
            case 'approved': return 'Đã duyệt';
            case 'pending': return 'Chờ duyệt';
            case 'rejected': return 'Từ chối';
            default: return status;
        }
    }, []);

    const handleApprove = async (registrationId) => {
        try {
            await api.put(`/api/registrations/${registrationId}/approve`);
            toast.success('Phê duyệt đăng ký thành công');
            fetchCourseDetails(); // Refresh data
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi phê duyệt');
        }
    };

    const handleReject = async (registrationId) => {
        const reason = window.prompt('Nhập lý do từ chối (tùy chọn):');
        // Allow empty reason
        if (reason !== null) {
            try {
                await api.put(`/api/registrations/${registrationId}/reject`, { reason: reason || 'Không có lý do' });
                toast.success('Từ chối đăng ký thành công');
                fetchCourseDetails(); // Refresh data
            } catch (error) {
                toast.error(error.response?.data?.message || 'Lỗi khi từ chối');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">Không tìm thấy khóa học</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/teacher/courses" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Quay lại danh sách khóa học
                </Link>
            </div>

            {/* Course Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-3xl font-bold text-gray-900">{course.subject?.subjectName}</h1>
                <p className="text-xl text-gray-600 mt-1">{course.subject?.subjectCode} - {course.classCode}</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                        <span>{course.subject?.credits} tín chỉ</span>
                    </div>
                    <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-purple-500" />
                        <span>{course.currentStudents}/{course.maxStudents} sinh viên</span>
                    </div>
                    <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                        <span>{course.semester?.name || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Danh sách sinh viên đăng ký</h3>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Lọc:</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field py-1 text-sm">
                            <option value="all">Tất cả</option>
                            <option value="pending">Chờ duyệt</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="rejected">Đã từ chối</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {filteredRegistrations.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã sinh viên</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRegistrations.map(({ _id, student, status }) => (
                                    <tr key={_id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Hash className="h-4 w-4 text-gray-400 mr-2" />
                                                <div className="text-sm text-gray-900">{student?.studentId || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 text-gray-400 mr-2" />
                                                <div className="text-sm font-medium text-gray-900">{student?.firstName} {student?.lastName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                <div className="text-sm text-gray-500">{student?.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
                                                {getStatusDisplayName(status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {status === 'pending' && (
                                                <div className="flex justify-center items-center gap-4">
                                                    <button onClick={() => handleApprove(_id)} className="text-green-600 hover:text-green-900" title="Duyệt">
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleReject(_id)} className="text-red-600 hover:text-red-900" title="Từ chối">
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có sinh viên</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Hiện chưa có sinh viên nào đăng ký khóa học này.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherCourseDetail;
