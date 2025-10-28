import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Filter,
  BookOpen,
  Users,
  Calendar,
  Eye
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    semester: '',
    subject: '',
    onlyMySchoolCourses: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showScheduleDetailModal, setShowScheduleDetailModal] = useState(false);
  const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'register'
  // State to hold registration status for the selected course
  const [registrationForThisSubject, setRegistrationForThisSubject] = useState(null);
  // State for popover
  const [hoveredNote, setHoveredNote] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [isThisCourseRegistered, setIsThisCourseRegistered] = useState(false);

  const fetchMyRegistrations = useCallback(async () => {
    if (user?.role === 'student') {
      try {
        const regsRes = await api.get('/api/registrations');
        setMyRegistrations(regsRes.data.registrations);
      } catch (error) {
        // Don't show a toast here to avoid bothering the user on re-fetches
        console.error("Failed to re-fetch registrations:", error);
      }
    }
  }, [user?.role]);

  const dayOfWeekNames = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ Nhật' };
  const periodNames = { 1: 'Ca 1 (6h45-9h25)', 2: 'Ca 2 (9h40-12h10)', 3: 'Ca 3 (13h-15h30)', 4: 'Ca 4 (15h45-18h25)' };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Ưu tiên lấy học kỳ hiện tại, nếu không có thì lấy các học kỳ đang hoạt động
        let currentSemesterRes;
        try {
          currentSemesterRes = await api.get('/api/semesters/current');
        } catch (error) {
          // Bỏ qua lỗi nếu không tìm thấy học kỳ hiện tại
        }

        const [allSemestersRes, subjectsRes] = await Promise.all([
          api.get('/api/semesters'),
          api.get('/api/subjects')
        ]);

        const allSemesters = allSemestersRes.data || [];
        setSemesters(allSemesters);

        // Thiết lập bộ lọc học kỳ mặc định
        if (currentSemesterRes?.data?._id) {
          setFilters(prev => ({ ...prev, semester: currentSemesterRes.data._id }));
        } else if (allSemesters.length > 0) {
          setFilters(prev => ({ ...prev, semester: allSemesters[0]._id }));
        }

        setSubjects(subjectsRes.data);
        fetchMyRegistrations(); // Call the registration fetch separately
      } catch (error) {
        toast.error('Không thể tải danh sách học kỳ.');
      }
    };
    fetchInitialData();
  }, [fetchMyRegistrations]);

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
      const params = {
        semester: filters.semester,
        subject: filters.subject || undefined, // Gửi subject nếu có
        school: filters.onlyMySchoolCourses ? user?.school?._id : undefined, // Gửi school nếu được chọn
        // Thêm searchTerm vào params để lọc ở backend nếu muốn
        // searchTerm: searchTerm || undefined,
      };

      const coursesRes = await api.get(`/api/courses`, { params: Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null)) });
      setCourses(coursesRes.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  }, [filters, user?.school?._id]); // Bỏ searchTerm, chỉ phụ thuộc vào filters và user school

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

  const handleMouseMove = (e) => {
    setPopoverPosition({ x: e.clientX, y: e.clientY });
  };


  const handleRegisterClick = (e, course) => {
    e.stopPropagation();
    setModalMode('register');

    // Calculate registration status for the clicked course
    const regForSubject = myRegistrations.find(
      reg => reg.course?.subject?._id === course.subject?._id && ['pending', 'approved'].includes(reg.status)
    );
    const isCourseRegistered = regForSubject && regForSubject.course?._id === course._id;

    setRegistrationForThisSubject(regForSubject);
    setIsThisCourseRegistered(isCourseRegistered);

    setSelectedCourseForSchedule(course);
    setShowScheduleDetailModal(true);
  };

  const handleConfirmRegister = async () => {
    if (!selectedCourseForSchedule) return;

    // --- FIX: Add validation to prevent crash if semester is null ---
    if (!selectedCourseForSchedule.semester?._id) {
      toast.error('Lỗi: Lớp học phần này không thuộc về một học kỳ hợp lệ. Vui lòng liên hệ quản trị viên.');
      return;
    }

    try {
      await api.post('/api/registrations', {
        courseId: selectedCourseForSchedule._id,
        semesterId: selectedCourseForSchedule.semester._id
      });

      toast.success('Đăng ký khóa học thành công!');
      setShowScheduleDetailModal(false);
      fetchCourses(); // Tải lại danh sách lớp học
      fetchMyRegistrations(); // Tải lại danh sách đăng ký của sinh viên
    } catch (error) {
      console.error('Error registering for course:', error);
      if (error.response && error.response.status === 409 && error.response.data.conflictType === 'SUBJECT_DUPLICATE' && error.response.data.existingRegistrationId) {
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
      fetchCourses(); // Tải lại danh sách lớp học
      fetchMyRegistrations(); // Tải lại danh sách đăng ký của sinh viên
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
    // Việc lọc theo school và subject đã được thực hiện ở backend.
    // Giờ đây chúng ta chỉ cần lọc theo searchTerm ở client.
    const term = removeAccents(searchTerm.toLowerCase());
    const subjectName = removeAccents(course.subject?.subjectName?.toLowerCase() || '');
    const subjectCode = removeAccents(course.subject?.subjectCode?.toLowerCase() || '');
    const teacherName = removeAccents(`${course.teacher?.firstName} ${course.teacher?.lastName}`.toLowerCase() || '');
    const classCode = removeAccents(course.classCode?.toLowerCase() || '');

    return subjectName.includes(term) || subjectCode.includes(term) || teacherName.includes(term) || classCode.includes(term);
  });

  const filteredSubjectsForDropdown = useMemo(() => {
    if (filters.onlyMySchoolCourses && user?.role === 'student' && user.school?._id) {
      return subjects.filter(sub => 
        sub.schools && sub.schools.some(schoolId => schoolId === user.school._id)
      );
    }
    return subjects;
  }, [subjects, filters.onlyMySchoolCourses, user]);


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
                <label className="form-label">Môn học</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="input-field"
                >
                  <option value="">Tất cả môn học</option>
                  {filteredSubjectsForDropdown.map((sub) => <option key={sub._id} value={sub._id}>{sub.subjectName} ({sub.subjectCode})</option>)}
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

            const registrationForThisSubject = myRegistrations.find(
              reg => reg.course?.subject?._id === course.subject?._id && ['pending', 'approved'].includes(reg.status)
            );

            const isThisCourseRegistered = registrationForThisSubject && registrationForThisSubject.course?._id === course._id;

            const isRegistrationPeriodOpen = course.semester &&
              new Date() >= new Date(course.semester.registrationStartDate) &&
              new Date() <= new Date(course.semester.registrationEndDate);

            const buttonText = isThisCourseRegistered ? 'Đã đăng ký' : registrationForThisSubject ? 'Đổi lớp' : 'Đăng ký';
            const buttonDisabled = !course.isActive || isThisCourseRegistered;

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
                  <span 
                    className={`px-2 py-1 text-xs font-medium rounded-full ${course.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    onMouseEnter={(e) => {
                      if (!course.isActive && course.notes) {
                        handleMouseMove(e);
                        setHoveredNote(course.notes);
                      }
                    }}
                    onMouseLeave={() => setHoveredNote(null)}
                  >
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
                      onClick={(e) => handleRegisterClick(e, course)} // This will now handle both register and switch
                      disabled={!isRegistrationPeriodOpen || buttonDisabled}
                      className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white ${isThisCourseRegistered ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {!isRegistrationPeriodOpen ? 'Hết hạn ĐK' : buttonText}
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

      {/* Note Popover */}
      {hoveredNote && (
        <div
          className="fixed max-w-xs bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 z-50 pointer-events-none"
          style={{
            top: `${popoverPosition.y + 15}px`,
            left: `${popoverPosition.x + 15}px`,
            transform: popoverPosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'none',
          }}
        >
          {hoveredNote}
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
                    {registrationForThisSubject && !isThisCourseRegistered
                      ? `Bạn có muốn đổi từ lớp ${registrationForThisSubject.course.classCode} sang lớp này không?`
                      : 'Bạn có chắc chắn muốn đăng ký học phần này không?'}
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