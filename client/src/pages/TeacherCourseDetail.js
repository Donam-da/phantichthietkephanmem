import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Users, User, Mail, Hash, Check, X, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TeacherCourseDetail = () => {
    const { id: courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredRegistrationId, setHoveredRegistrationId] = useState(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
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
            window.location.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi phê duyệt');
        }
    };

    const handleReject = async (registrationId) => {
        const reason = window.prompt('Vui lòng nhập lý do từ chối để gửi cho quản trị viên xem xét:');
        if (!reason) {
            toast.error('Bạn phải cung cấp lý do từ chối.');
            return;
        }
        if (reason !== null) {
            try {
                await api.put(`/api/registrations/${registrationId}/reject`, { reason: reason || 'Không có lý do' });
                toast.success('Từ chối đăng ký thành công');
                window.location.reload();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Lỗi khi từ chối');
            }
        }
    };

    const handleMouseMove = (e) => {
        setPopoverPosition({ x: e.clientX, y: e.clientY });
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
                                {filteredRegistrations.map((registration) => (
                                    <tr 
                                      key={registration._id}
                                      onMouseEnter={() => setHoveredRegistrationId(registration._id)}
                                      onMouseLeave={() => setHoveredRegistrationId(null)}
                                      onMouseMove={handleMouseMove}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Hash className="h-4 w-4 text-gray-400 mr-2" />
                                                <div className="text-sm text-gray-900">{registration.student?.studentId || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 text-gray-400 mr-2" />
                                                <div className="text-sm font-medium text-gray-900">{registration.student?.firstName} {registration.student?.lastName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="flex items-center">
                                                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div className="text-sm text-gray-500">{registration.student?.email}</div>
                                                </div>
                                                {registration.status === 'pending' && registration.rejectionRequest?.requested && (
                                                <div className="mt-2 text-xs text-orange-600 p-2 bg-orange-50 rounded-md">
                                                    <strong>GV đề nghị từ chối:</strong> {registration.rejectionRequest.reason}
                                                </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(registration.status)}`}>
                                                {getStatusDisplayName(registration.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {registration.status === 'pending' && !registration.rejectionRequest?.requested ? (
                                                course.semester && new Date() > new Date(course.semester.registrationEndDate) ? (
                                                    <div className="flex justify-center items-center gap-4">
                                                        <button onClick={() => handleApprove(registration._id)} className="text-green-600 hover:text-green-900" title="Duyệt">
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => handleReject(registration._id)} className="text-red-600 hover:text-red-900" title="Từ chối">
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-blue-600">
                                                        Chờ hết hạn ĐK
                                                    </div>
                                                )
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        course?.semester?.registrationEndDate && new Date() < new Date(course.semester.registrationEndDate) ? (
                            <div className="text-center py-12">
                                <Clock className="mx-auto h-12 w-12 text-blue-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Thời gian đăng ký chưa kết thúc</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Danh sách sinh viên sẽ được hiển thị sau ngày {new Date(course.semester.registrationEndDate).toLocaleDateString('vi-VN')}.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Users className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có sinh viên</h3>
                                <p className="mt-1 text-sm text-gray-500">Hiện chưa có sinh viên nào đăng ký khóa học này.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Hover Popover */}
            {hoveredRegistrationId && (() => {
                const registration = registrations.find(r => r._id === hoveredRegistrationId);
                if (!registration) return null;

                return (
                    <div
                        className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 pointer-events-none"
                        style={{
                            top: `${popoverPosition.y + 20}px`,
                            left: `${popoverPosition.x + 20}px`,
                            transform: 'translate(-50%, 0)', // Center horizontally on cursor
                        }}
                    >
                        <h4 className="font-bold text-gray-800">Chi tiết Đăng ký</h4>
                        <p className="text-sm text-gray-500 border-b pb-2 mb-2">
                            {registration.course?.subject?.subjectName} - {registration.course?.classCode}
                        </p>
                        <div className="space-y-1 text-sm">
                            <p><span className="font-semibold">Sinh viên:</span> {registration.student?.firstName} {registration.student?.lastName}</p>
                            <p><span className="font-semibold">Mã SV:</span> {registration.student?.studentId}</p>
                            <p><span className="font-semibold">Trạng thái:</span> {getStatusDisplayName(registration.status)}</p>
                            <p><span className="font-semibold">Ngày ĐK:</span> {new Date(registration.registrationDate).toLocaleString('vi-VN')}</p>
                            {registration.status === 'approved' && registration.approvedBy && (
                                <p><span className="font-semibold">Người duyệt:</span> {registration.approvedBy.firstName} {registration.approvedBy.lastName}</p>
                            )}
                            {registration.rejectionReason && <p><span className="font-semibold">Lý do từ chối:</span> {registration.rejectionReason}</p>}
                            {registration.rejectionRequest?.requested && <p><span className="font-semibold">GV đề nghị từ chối:</span> {registration.rejectionRequest.reason}</p>}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TeacherCourseDetail;
