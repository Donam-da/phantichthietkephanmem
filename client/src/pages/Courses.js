import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Filter,
  BookOpen,
  Users,
  Calendar,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    semester: '',
    onlyMySchoolCourses: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showScheduleDetailModal, setShowScheduleDetailModal] = useState(false);
  const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'register'

  const dayOfWeekNames = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ Nhật' };
  const periodNames = { 1: 'Ca 1 (6h45-9h25)', 2: 'Ca 2 (9h40-12h10)', 3: 'Ca 3 (13h-15h30)', 4: 'Ca 4 (15h45-18h25)' };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const semestersRes = await api.get('/api/semesters?isActive=true');
        setSemesters(semestersRes.data);
        if (semestersRes.data.length > 0) {
          setFilters(prev => ({ ...prev, semester: semestersRes.data[0]._id }));
        }
      } catch (error) {
        toast.error('Không thể tải danh sách học kỳ.');
      }
    };
    fetchInitialData();
  }, []);

  const getDatesForDayOfWeek = useCallback((semesterId, dayOfWeek) => {
    if (!semesterId || !dayOfWeek) return [];

    const selectedSemester = semesters.find(s => s._id === semesterId);
    if (!selectedSemester || !selectedSemester.startDate || !selectedSemester.endDate) return [];

    const dates = [];
    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // My format: 2=Mon, ..., 7=Sat, 8=Sun
    const jsDayOfWeek = dayOfWeek === 8 ? 0 : dayOfWeek - 1;

    // Create dates in UTC to avoid timezone issues
    const startDate = new Date(selectedSemester.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(selectedSemester.endDate);
    endDate.setUTCHours(0, 0, 0, 0);

    let currentDate = new Date(startDate);

    // Find the first occurrence of the day
    while (currentDate.getUTCDay() !== jsDayOfWeek) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      if (currentDate > endDate) return [];
    }

    // Loop through the weeks
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    }

    return dates;
  }, [semesters]);

  const fetchCourses = useCallback(async () => {
    if (!filters.semester) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.semester) params.append('semester', filters.semester);

      const response = await api.get(`/api/courses?${params.toString()}`);
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  }, [filters.semester]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSearch = (e) => {
    e.preventDefault();
    // The search will be client-side for simplicity now
  };

  const handleClickCourse = (course) => {
    setModalMode('view');
    setSelectedCourseForSchedule(course);
    setShowScheduleDetailModal(true);
  };

  const handleRegisterClick = (e, course) => {
    e.stopPropagation();
    setModalMode('register');
    setSelectedCourseForSchedule(course);
    setShowScheduleDetailModal(true);
  };

  const handleConfirmRegister = async () => {
    if (!selectedCourseForSchedule) return;

    try {
      const response = await api.post('/api/registrations', {
        courseId: selectedCourseForSchedule._id,
        semesterId: selectedCourseForSchedule.semester._id
      });

      toast.success('Đăng ký khóa học thành công!');
      setShowScheduleDetailModal(false);
      // Optionally, you can refetch courses to update student count, or update locally
    } catch (error) {
      console.error('Error registering for course:', error);
      if (error.response && error.response.status === 409 && error.response.data.conflictType === 'SUBJECT_DUPLICATE') {
        // Handle the specific case of switching course sections
        if (window.confirm(error.response.data.message)) {
          handleSwitchCourse(error.response.data.existingRegistrationId, selectedCourseForSchedule._id);
        }
      } else {
        toast.error(error.response?.data?.message || 'Đăng ký thất bại');
      }
    }
  };

  const handleSwitchCourse = async (oldRegistrationId, newCourseId) => {
    const toastId = toast.loading('Đang chuyển lớp...');
    try {
      await api.post('/api/registrations/switch', {
        oldRegistrationId,
        newCourseId,
      });
      toast.success('Chuyển lớp thành công!', { id: toastId });
      setShowScheduleDetailModal(false);
      // You might want to navigate to my-registrations or refresh the current view
    } catch (error) {
      console.error('Error switching course:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi chuyển lớp.', { id: toastId });
    }
  };

  const generateDetailedSchedule = (course) => {
    if (!course || !course.semester) return [];

    const detailedSchedule = [];
    course.schedule.forEach(scheduleItem => {
      const dates = getDatesForDayOfWeek(course.semester._id, scheduleItem.dayOfWeek);
      dates.forEach(date => {
        // Calculate start (Monday) and end (Sunday) of the week for the given date
        const day = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust for Sunday
        const startOfWeek = new Date(date);
        startOfWeek.setUTCDate(date.getUTCDate() + diffToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

        let session = '';
        if ([1, 2].includes(scheduleItem.period)) session = 'Sáng';
        if ([3, 4].includes(scheduleItem.period)) session = 'Chiều';

        let startingPeriod = '';
        switch (scheduleItem.period) {
          case 1: startingPeriod = '1-3'; break;
          case 2: startingPeriod = '4-6'; break;
          case 3: startingPeriod = '7-9'; break;
          case 4: startingPeriod = '10-12'; break;
          default: break;
        }

        detailedSchedule.push({
          dateObject: date, // Add the date object for sorting
          session,
          startOfWeek: startOfWeek.toLocaleDateString('vi-VN'),
          endOfWeek: endOfWeek.toLocaleDateString('vi-VN'),
          day: `${dayOfWeekNames[scheduleItem.dayOfWeek]} - ${date.toLocaleDateString('vi-VN')}`,
          numberOfPeriods: 3,
          startingPeriod,
          classroom: scheduleItem.classroom?.roomCode || 'N/A',
          teacher: `${course.teacher?.firstName} ${course.teacher?.lastName}`
        });
      });
    });

    // Sort the entire schedule by date, then by period
    detailedSchedule.sort((a, b) => a.dateObject - b.dateObject);
    return detailedSchedule; // Return the sorted schedule
  };

  const clearFilters = () => {
    setFilters(prev => ({ ...prev, semester: semesters.length > 0 ? semesters[0]._id : '' }));
    setSearchTerm('');
  };

  const removeAccents = (str) => {
    if (!str) return '';
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  const filteredCourses = courses.filter(course => {
    // Filter by school
    if (filters.onlyMySchoolCourses && user?.role === 'student' && user.school?._id) {
      if (!course.subject?.schools?.includes(user.school._id)) {
        return false;
      }
    }

    const term = removeAccents(searchTerm.toLowerCase());
    const subjectName = removeAccents(course.subject?.subjectName?.toLowerCase() || '');
    const subjectCode = removeAccents(course.subject?.subjectCode?.toLowerCase() || '');
    const teacherName = removeAccents(`${course.teacher?.firstName} ${course.teacher?.lastName}`.toLowerCase() || '');
    const classCode = removeAccents(course.classCode?.toLowerCase() || '');

    return subjectName.includes(term) || subjectCode.includes(term) || teacherName.includes(term) || classCode.includes(term);
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Danh sách Lớp học phần</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tìm kiếm và đăng ký các lớp học phần trong học kỳ hiện tại.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc
            </button>
            <button type="button" onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-500">
              Xóa bộ lọc
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="form-label">Lớp học phần</label>
                <input type="text" placeholder="Tìm theo tên môn, mã môn, GV..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" />
              </div>

              <div>
                <label className="form-label">Học kỳ</label>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                  className="input-field"
                >
                  <option value="">Tất cả học kỳ</option>
                  {semesters.map((sem) => (
                    <option key={sem._id} value={sem._id}>{sem.name} ({sem.academicYear})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Tùy chọn</label>
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="onlyMySchoolCourses"
                    checked={filters.onlyMySchoolCourses}
                    onChange={(e) => setFilters(prev => ({ ...prev, onlyMySchoolCourses: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="onlyMySchoolCourses" className="ml-2 block text-sm text-gray-900">Chỉ hiển thị học phần cho trường của tôi</label>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isForMySchool = !user.school?._id || course.subject?.schools?.includes(user.school._id);

            return (
            <div 
              key={course._id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col cursor-pointer ${!isForMySchool ? 'bg-gray-50' : ''}`}
              onClick={() => handleClickCourse(course)}
            >
              <div className="p-6 flex flex-col flex-grow">
                {/* Course Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {course.subject?.subjectName}
                    </h3>
                    <p className="text-sm text-gray-500">{course.subject?.subjectCode} - {course.classCode}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${course.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {course.isActive ? 'Đang mở' : 'Đã đóng'}
                  </span>
                </div>

                {/* Course Info */}
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                    <span>{course.subject?.credits} tín chỉ</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2 text-purple-500" />
                    <span>{course.currentStudents}/{course.maxStudents} sinh viên</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                    <span>GV: {course.teacher?.firstName} {course.teacher?.lastName}</span>
                  </div>
                  {course.schedule.map((s, i) => (
                    <div key={i} className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{dayOfWeekNames[s.dayOfWeek]}, {periodNames[s.period]}, P. {s.classroom?.roomCode}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Ngăn sự kiện click lan ra thẻ div cha
                      handleClickCourse(course);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Chi tiết
                  </button>

                  {isForMySchool && (
                    <button
                      type="button"
                      onClick={(e) => handleRegisterClick(e, course)}
                      disabled={!course.isActive}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Đăng ký
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy khóa học</h3>
          <p className="mt-1 text-sm text-gray-500">
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      )}

      {/* Results Summary */}
      {filteredCourses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 text-center">
            Hiển thị {filteredCourses.length} lớp học phần
          </p>
        </div>
      )}

      {/* Detailed Schedule Modal */}
      {showScheduleDetailModal && selectedCourseForSchedule && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Chi tiết Lịch học: {selectedCourseForSchedule.subject?.subjectName}
                </h3>
                <p className="text-sm text-gray-500">
                  Lớp: {selectedCourseForSchedule.classCode} - GV: {selectedCourseForSchedule.teacher?.firstName} {selectedCourseForSchedule.teacher?.lastName}
                </p>
              </div>
              <button
                onClick={() => setShowScheduleDetailModal(false)}
                className="p-2 -mt-2 -mr-2 rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buổi học</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày bắt đầu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kết thúc</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thứ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiết</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiết bắt đầu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng học</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảng viên</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {generateDetailedSchedule(selectedCourseForSchedule).map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.session}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.startOfWeek}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.endOfWeek}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.day}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.numberOfPeriods}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.startingPeriod}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.classroom}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.teacher}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex items-center justify-between">
              {modalMode === 'register' ? (
                <>
                  <p className="text-sm text-gray-700">
                    Bạn có chắc chắn muốn đăng ký học phần này không?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowScheduleDetailModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmRegister}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Xác nhận đăng ký
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => setShowScheduleDetailModal(false)} className="ml-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses; 