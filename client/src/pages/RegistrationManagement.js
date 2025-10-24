import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RegistrationManagement = () => {
  const { user, isTeacher } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRegistrationId, setHoveredRegistrationId] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [showOnlyMyCourses, setShowOnlyMyCourses] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/api/registrations');
      setRegistrations(response.data.registrations);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId) => {
    try {
      await api.put(`/api/registrations/${registrationId}/approve`);
      toast.success('Phê duyệt đăng ký thành công');
      window.location.reload();
    } catch (error) {
      toast.error('Lỗi khi phê duyệt đăng ký');
    }
  };

  const handleReject = async (registration) => {
    const registrationId = registration._id;
    const suggestedReason = registration.rejectionRequest?.reason || '';
    const reason = window.prompt('Nhập lý do từ chối:', suggestedReason);
    if (reason) {
      try {
        await api.put(`/api/registrations/${registrationId}/reject`, { reason });
        toast.success('Từ chối đăng ký thành công');
        window.location.reload();
      } catch (error) {
        toast.error('Lỗi khi từ chối đăng ký');
      }
    }
  };

  const handleMouseMove = (e) => {
    setPopoverPosition({ x: e.clientX, y: e.clientY });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'dropped':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ phê duyệt';
      case 'approved':
        return 'Đã phê duyệt';
      case 'rejected':
        return 'Đã từ chối';
      case 'dropped':
        return 'Đã hủy';
      case 'completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  };

  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = registration.student?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.student?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.course?.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.course?.courseCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || registration.status === statusFilter;
    
    let matchesTeacher = true;
    if (isTeacher && showOnlyMyCourses) {
      matchesTeacher = registration.course?.teacher?._id === user.id;
    }
    return matchesSearch && matchesStatus && matchesTeacher;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Quản lý đăng ký khóa học</h1>
        
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên sinh viên hoặc khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="rejected">Đã từ chối</option>
            <option value="dropped">Đã hủy</option>
            <option value="completed">Hoàn thành</option>
          </select>
          {isTeacher && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showOnlyMyCourses"
                checked={showOnlyMyCourses}
                onChange={(e) => setShowOnlyMyCourses(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showOnlyMyCourses" className="ml-2 block text-sm text-gray-900">
                Chỉ hiển thị lớp của tôi
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredRegistrations.map((registration) => (
            <li 
              key={registration._id}
              className="px-6 py-4"
              onMouseEnter={() => setHoveredRegistrationId(registration._id)}
              onMouseLeave={() => setHoveredRegistrationId(null)}
              onMouseMove={handleMouseMove}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {registration.student?.firstName} {registration.student?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        MSSV: {registration.student?.studentId}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Khóa học: {registration.course?.courseCode} - {registration.course?.courseName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Học kỳ: {registration.semester?.name} ({registration.semester?.academicYear})
                      </p>
                      <p className="text-sm text-gray-500">
                        Ngày đăng ký: {new Date(registration.registrationDate).toLocaleDateString('vi-VN')}
                      </p>
                      {registration.status === 'pending' && registration.rejectionRequest?.requested && (
                        <div className="mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 text-orange-700 text-sm">
                          <strong>GV đề nghị từ chối:</strong> {registration.rejectionRequest.reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(registration.status)}`}>
                        {getStatusText(registration.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {registration.status === 'pending' && (!isTeacher || registration.course?.teacher?._id === user.id) && (
                    <>
                      <button
                        onClick={() => handleApprove(registration._id)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium"
                      >
                        Phê duyệt
                      </button>
                      <button
                        onClick={() => handleReject(registration)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
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
                      <p><span className="font-semibold">Trạng thái:</span> {getStatusText(registration.status)}</p>
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

export default RegistrationManagement;
