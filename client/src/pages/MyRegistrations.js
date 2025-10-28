import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Clock,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const MyRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const { user } = useAuth(); // Lấy thông tin user từ AuthContext

  const dayOfWeekNames = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ Nhật' };
  const periodNames = { 1: 'Ca 1 (6h45-9h25)', 2: 'Ca 2 (9h40-12h10)', 3: 'Ca 3 (13h-15h30)', 4: 'Ca 4 (15h45-18h25)' };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/registrations');
      setRegistrations(response.data.registrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleDrop = async () => {
    if (!selectedRegistration) return;

    if (!window.confirm('Bạn có chắc chắn muốn xóa khóa học này?')) {
      return;
    }

    try {
      await api.delete(`/api/registrations/${selectedRegistration._id}`);
      toast.success('Đã xóa khóa học thành công!');
      fetchRegistrations(); // Tải lại danh sách đăng ký để cập nhật giao diện
      setShowDetailModal(false); // Close modal after dropping
      setSelectedRegistration(null); // Clear selected registration
    } catch (error) {
      console.error('Error dropping course:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa khóa học');
    }
  };

  const handleDropFromList = async (registrationToDrop) => {
    if (!registrationToDrop) return;

    if (!window.confirm(`Bạn có chắc chắn muốn hủy lớp học phần "${registrationToDrop.course?.subject?.subjectName}"?`)) {
      return;
    }

    const toastId = toast.loading('Đang hủy lớp học phần...');
    try {
      await api.delete(`/api/registrations/${registrationToDrop._id}`);
      toast.success('Đã hủy lớp học phần thành công!', { id: toastId });
      fetchRegistrations(); // Tải lại danh sách để cập nhật giao diện
    } catch (error) {
      console.error('Error dropping course from list:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy lớp học phần', { id: toastId });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'dropped': return 'text-gray-600 bg-gray-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'pending': return 'Chờ duyệt';
      case 'rejected': return 'Từ chối';
      case 'dropped': return 'Đã xóa';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Lớp bị hủy';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5" />;
      case 'pending': return <Clock className="h-5 w-5" />;
      case 'rejected': return <XCircle className="h-5 w-5" />;
      case 'dropped': return <Trash2 className="h-5 w-5" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const filteredRegistrations = registrations.filter(registration => {
    if (filter === 'all') return true;
    return registration.status === filter;
  });

  const openDetailModal = (registration) => {
    setSelectedRegistration(registration);
    setShowDetailModal(true);
  };

  const hasAnyConflict = filteredRegistrations.some(r => r.hasConflict);
  const hasAnySubjectConflict = filteredRegistrations.some(r => r.hasSubjectConflict);

  // Tính toán lại tổng số tín chỉ từ danh sách đăng ký đã được duyệt
  const totalApprovedCredits = useMemo(() => {
    return registrations
      .filter(r => ['approved', 'pending'].includes(r.status)) // Bao gồm cả 'pending'
      .reduce((total, r) => total + (r.course?.subject?.credits || 0), 0);
  }, [registrations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đăng ký của tôi</h1>
        <p className="mt-2 text-sm text-gray-700">
          Quản lý các khóa học bạn đã đăng ký
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng đăng ký</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredRegistrations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đã duyệt</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredRegistrations.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredRegistrations.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tín chỉ hiện tại</p>
              <p className="text-2xl font-semibold text-gray-900">{totalApprovedCredits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Tất cả ({registrations.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Chờ duyệt ({registrations.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Đã duyệt ({registrations.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'completed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Hoàn thành ({registrations.filter(r => r.status === 'completed').length})
          </button>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasAnyConflict && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <div className="flex">
            <div className="py-1"><AlertCircle className="h-6 w-6 text-red-500 mr-4" /></div>
            <div>
              <p className="font-bold">Cảnh báo: Trùng lịch học!</p>
              <p className="text-sm">Hệ thống phát hiện bạn đã đăng ký các học phần bị trùng lịch. Vui lòng kiểm tra và hủy một trong các học phần được đánh dấu màu đỏ để đảm bảo lịch học hợp lệ.</p>
            </div>
          </div>
        </div>
      )}

      {/* Subject Conflict Warning */}
      {hasAnySubjectConflict && (
        <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md" role="alert">
          <div className="flex">
            <div className="py-1"><AlertCircle className="h-6 w-6 text-purple-500 mr-4" /></div>
            <div>
              <p className="font-bold">Cảnh báo: Đăng ký trùng môn học!</p>
              <p className="text-sm">Hệ thống phát hiện bạn đã đăng ký nhiều lớp cho cùng một môn học. Vui lòng kiểm tra và hủy các lớp không cần thiết để đảm bảo dữ liệu hợp lệ.</p>
            </div>
          </div>
        </div>
      )}


      {/* Registrations List */}
      {filteredRegistrations.length > 0 ? (
        <div className="space-y-4">
          {filteredRegistrations.map((registration) => (
            <div key={registration._id} className={`bg-white rounded-lg shadow-sm border ${registration.hasConflict ? 'border-red-500 ring-2 ring-red-200' : registration.hasSubjectConflict ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'}`} onDoubleClick={() => openDetailModal(registration)}>
              <div className="p-6 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(registration.status)}`}>
                        {getStatusIcon(registration.status)}
                        <span className="ml-2">{getStatusDisplayName(registration.status)}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        Đăng ký: {new Date(registration.registrationDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {registration.hasConflict && registration.semester?.isRegistrationOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn không cho modal chi tiết mở ra
                          handleDropFromList(registration);
                        }}
                        className="absolute top-4 right-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Hủy lớp
                      </button>
                    )}

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {registration.course?.subject?.subjectName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{registration.course?.subject?.subjectCode} - {registration.course?.classCode}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                        <span>{registration.course?.subject?.credits || registration.course?.credits} tín chỉ</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2 text-green-500" />
                        <span>{registration.course?.teacher?.firstName} {registration.course?.teacher?.lastName}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                        <span>{registration.semester?.name}</span>
                      </div>
                    </div>
                    {/* Grades */}
                    {registration.grade && (registration.grade.attendance || registration.grade.midterm || registration.grade.final) && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Điểm số:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {registration.grade.attendance && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">{registration.grade.attendance}</div>
                              <div className="text-xs text-gray-600">Chuyên cần</div>
                            </div>
                          )}
                          {registration.grade.midterm && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">{registration.grade.midterm}</div>
                              <div className="text-xs text-gray-600">Giữ kỳ</div>
                            </div>
                          )}
                          {registration.grade.final && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-purple-600">{registration.grade.final}</div>
                              <div className="text-xs text-gray-600">Cuối kỳ</div>
                            </div>
                          )}
                        </div>
                        {registration.grade.finalGrade && (
                          <div className="mt-2 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              Điểm cuối: {registration.grade.finalGrade}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {filter === 'all' ? 'Chưa có đăng ký nào' : 'Không có đăng ký nào phù hợp'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all'
              ? 'Bạn chưa đăng ký khóa học nào. Hãy tìm và đăng ký khóa học phù hợp.'
              : 'Không có đăng ký nào với trạng thái này.'
            }
          </p>
        </div>
      )}

      {/* Summary */}
      {filteredRegistrations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Hiển thị {filteredRegistrations.length} đăng ký
              {filter !== 'all' && ` với trạng thái "${getStatusDisplayName(filter)}"`}
            </p>
            {filter === 'all' && (
              <p className="text-sm text-gray-500 mt-1">
                Tổng tín chỉ đã đăng ký: {totalApprovedCredits}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRegistration && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Chi tiết Đăng ký: {selectedRegistration.course?.subject?.subjectName}
                </h3>
                <p className="text-sm text-gray-500">
                  Lớp: {selectedRegistration.course?.classCode} - GV: {selectedRegistration.course?.teacher?.firstName} {selectedRegistration.course?.teacher?.lastName}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 -mt-2 -mr-2 rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Trạng thái:</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRegistration.status)}`}>
                    {getStatusIcon(selectedRegistration.status)}
                    <span className="ml-2">{getStatusDisplayName(selectedRegistration.status)}</span>
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ngày đăng ký:</p>
                  <p className="font-medium text-gray-900">{new Date(selectedRegistration.registrationDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Số tín chỉ:</p>
                  <p className="font-medium text-gray-900">{selectedRegistration.course?.subject?.credits || selectedRegistration.course?.credits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Học kỳ:</p>
                  <p className="font-medium text-gray-900">{selectedRegistration.semester?.name}</p>
                </div>
              </div>

              {/* Weekly Schedule */}
              {selectedRegistration.course?.schedule && selectedRegistration.course.schedule.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Lịch học hàng tuần:</p>
                  <div className="space-y-2 rounded-md border border-gray-200 p-4">
                    {selectedRegistration.course.schedule.map((session, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-800">
                        <Calendar className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span>
                          <span className="font-medium">{dayOfWeekNames[session.dayOfWeek]}</span>, {periodNames[session.period]}
                          {session.classroom?.roomCode && <span className="ml-2 text-gray-500">(Phòng: {session.classroom.roomCode})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {['pending', 'approved'].includes(selectedRegistration.status) && 
               selectedRegistration.semester && 
               new Date() >= new Date(selectedRegistration.semester.registrationStartDate) && 
               new Date() <= new Date(selectedRegistration.semester.registrationEndDate) && (
                <button
                  onClick={handleDrop}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy lớp học phần
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRegistrations; 