import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Trash2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

const CourseManagement = () => {
  const { user, isTeacher } = useAuth(); // Giữ lại dòng này
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [allSchools, setAllSchools] = useState([]); // State mới cho danh sách trường
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [hoveredCourseId, setHoveredCourseId] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [statusNote, setStatusNote] = useState(null); // State for status popover
  const [occupiedSlots, setOccupiedSlots] = useState(new Set());
  // State cho xóa hàng loạt
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filters, setFilters] = useState({
    // ... (filters state remains the same)
    semester: '',
    subject: '',
    searchTerm: '',
    school: '', // State mới cho bộ lọc trường
    onlyMyCourses: true, // New filter state for teachers
  });
  const [formData, setFormData] = useState({
    subject: '',
    classCodePart: '', // Giữ lại dòng này
    maxStudents: 50,
    semester: '',
    teacher: '',
    schedule: [{ dayOfWeek: 2, period: 1, classroom: '' }],
    isActive: true, // Thêm trường isActive
  });

  // Helper for displaying room types
  const roomTypeNames = {
    computer_lab: 'Phòng máy',
    theory: 'Lý thuyết',
    lab: 'Thực hành',
    lecture_hall: 'Giảng đường',
  };
  const dayOfWeekNames = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ Nhật' };
  const periodNames = { 1: 'Ca 1 (6h45-9h25)', 2: 'Ca 2 (9h40-12h10)', 3: 'Ca 3 (13h-15h30)', 4: 'Ca 4 (15h45-18h25)' }; // Giữ lại dòng này
  const [showScheduleDetailModal, setShowScheduleDetailModal] = useState(false);
  const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState(null);

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
  }, [semesters]); // FIX: Add 'semesters' to the dependency array

  // Fetch static data like subjects, teachers, semesters, classrooms once
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const apiCalls = [
          api.get('/api/subjects'),
          api.get('/api/semesters?isActive=true'),
          api.get('/api/classrooms'),
          api.get('/api/schools'), // Thêm API call để lấy danh sách trường
        ];
        if (!isTeacher) {
          apiCalls.push(api.get('/api/users?role=teacher&populateSchools=true')); // NEW: Request teachers with populated schools
        }
        const [subjectsRes, semestersRes, classroomsRes, schoolsRes, teachersRes] = await Promise.all(apiCalls);

        setSubjects(subjectsRes.data);
        setSemesters(semestersRes.data);
        setClassrooms(classroomsRes.data);
        setAllSchools(schoolsRes.data); // Lưu danh sách trường
        if (teachersRes) {
          setTeachers(teachersRes.data.users);
          // Sắp xếp giảng viên theo số lớp được phân công giảm dần
          const sortedTeachers = (teachersRes.data.users || []).sort((a, b) => {
            return (b.assignedCourseCount ?? 0) - (a.assignedCourseCount ?? 0);
          });
          setTeachers(sortedTeachers);
        }

        // Set default semester filter if not set
        if (semestersRes.data.length > 0) {
          setFilters(prev => ({ ...prev, semester: prev.semester || semestersRes.data[0]._id }));
        } else {
          // FIX: If there are no semesters, stop loading and show an empty state.
          setLoading(false);
        }
      } catch (error) {
        toast.error('Lỗi khi tải dữ liệu nền.');
        setLoading(false); // Also stop loading on error
      }
    };
    fetchStaticData();
  }, [isTeacher]); // Removed user from dependency array as it's not directly used here

  // NEW: Reset subject filter when school filter changes
  useEffect(() => {
    // When school filter changes, reset the subject filter
    // to avoid an inconsistent state where a subject is selected
    // but not visible in the dropdown.
    setFilters(prev => ({ ...prev, subject: '' }));
  }, [filters.school]);
  const fetchCourses = useCallback(async () => {
    if (!filters.semester) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.school) params.append('school', filters.school); // Gửi schoolId lên backend
      // FIX: If user is a teacher, add the teacher filter to the main API call
      if (isTeacher) {
        params.append('teacher', user.id);
      }
      const courseApiUrl = `/api/courses?${params.toString()}`;
      const coursesRes = await api.get(courseApiUrl);

      let fetchedCourses = coursesRes.data.courses || []; // FIX: Ensure fetchedCourses is always an array

      setCourses(fetchedCourses);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách lớp học phần.');
    } finally {
      setLoading(false);
    }
  }, [filters.semester, filters.school, isTeacher, user?.id]); // Thêm filters.school vào dependency

  // NEW: Effect to sync course status on component mount for admins
  useEffect(() => {
    const syncCourseStatus = async () => {
      if (user && user.role === 'admin') {
        try {
          const res = await api.post('/api/courses/sync-teacher-status');
          if (res.data.count > 0) {
            toast.success(`Đã tự động khóa ${res.data.count} lớp học phần không có giảng viên. Đang làm mới...`);
            // Tải lại danh sách lớp học phần để cập nhật giao diện ngay lập tức
            fetchCourses();
          }
        } catch (error) {
          console.error("Failed to sync course status:", error);
          // Không hiển thị lỗi cho người dùng vì đây là tác vụ nền
        }
      }
    };
    syncCourseStatus();
  }, [user, fetchCourses]);

  // Fetch courses whenever the semester filter changes
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // NEW: Create a memoized list of subjects for the dropdown based on the selected school
  const filteredSubjectsForDropdown = React.useMemo(() => {
    if (!filters.school) {
      return subjects; // If no school is selected, show all subjects
    }
    // Filter subjects to only include those that belong to the selected school
    return subjects.filter(sub =>
      sub.schools && sub.schools.some(s => s._id === filters.school)
    );
  }, [filters.school, subjects]);


  const triggerRefetch = () => {
    setCourses([]); // Clear current courses to show loading state
    fetchCourses();
  };

  // Effect to calculate occupied slots for the form
  useEffect(() => {
    if (!showForm || !formData.semester) {
      setOccupiedSlots(new Set());
      return;
    }

    const newOccupiedSlots = new Set();
    courses
      .filter(c => c.semester?._id === formData.semester)
      // When editing, exclude the current course's own schedule from the conflict check
      .filter(c => !editingCourse || c._id !== editingCourse._id)
      .forEach(course => {
        course.schedule.forEach(slot => {
          if (slot.classroom?._id) {
            const key = `${slot.dayOfWeek}-${slot.period}-${slot.classroom._id}`;
            newOccupiedSlots.add(key);
          }
        });
      });
    setOccupiedSlots(newOccupiedSlots);
  }, [formData.semester, courses, editingCourse, showForm]);
  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { dayOfWeek: 2, period: 1, classroom: '' }],
    });
  };

  const removeSchedule = (index) => {
    const newSchedule = formData.schedule.filter((_, i) => i !== index);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const filteredCourses = courses
    .filter(course => {
      // Teacher specific filter
      if (isTeacher && filters.onlyMyCourses && course.teacher?._id !== user.id) {
        return false;
      }

      const term = filters.searchTerm.toLowerCase();
      const subjectMatch = !filters.subject || course.subject?._id === filters.subject;
      // Lọc theo trường ở client-side để đảm bảo tính nhất quán
      const schoolMatch = !filters.school || (course.subject?.schools && course.subject.schools.includes(filters.school));

      const searchMatch = !term ||
        course.subject?.subjectName.toLowerCase().includes(term) ||
        course.subject?.subjectCode.toLowerCase().includes(term) ||
        course.classCode.toLowerCase().includes(term);
      return subjectMatch && searchMatch && schoolMatch;
    })
    .sort((a, b) => {
      // Nếu đang lọc theo môn học, sắp xếp theo mã lớp
      if (filters.subject) {
        return a.classCode.localeCompare(b.classCode, undefined, { numeric: true });
      }
      return 0; // Giữ nguyên thứ tự mặc định nếu không lọc theo môn học
    });


  // --- LOGIC XÓA HÀNG LOẠT ---
  const handleSelectCourse = (id) => {
    setSelectedCourses(prev => prev.includes(id) ? prev.filter(courseId => courseId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    setSelectedCourses(e.target.checked ? filteredCourses.map(c => c._id) : []);
  };

  const handleDeleteSelected = () => {
    if (selectedCourses.length === 0) return;
    setConfirmAction(() => (password) => executeDeleteSelected(password));
    setIsConfirmModalOpen(true);
  };

  const executeDeleteSelected = async (password) => {
    setIsConfirming(true);
    const toastId = toast.loading(`Đang xóa ${selectedCourses.length} lớp học phần...`);
    try {
      await api.delete('/api/courses', { data: { courseIds: selectedCourses, password } });
      toast.success('Xóa thành công!', { id: toastId });
      setSelectedCourses([]);
      triggerRefetch();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
    } finally {
      setIsConfirming(false);
      setIsConfirmModalOpen(false);
    }
  };

  const resetForm = () => {
    setEditingCourse(null);
    setShowForm(false);
    setFormData({
      subject: '',
      classCodePart: '',
      maxStudents: 50,
      semester: '',
      teacher: '',
      schedule: [{ dayOfWeek: 2, period: 1, classroom: '' }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Construct classCode from classCodePart
    const classCode = `N0${formData.classCodePart}`;
    if (!/N0\d+/.test(classCode)) {
        toast.error('Mã lớp không hợp lệ. Vui lòng chỉ nhập số.');
        return;
    }

    // --- NEW: Internal Conflict Checking ---
    const scheduleEntries = new Set();
    const teacherScheduleEntries = new Set(); // NEW: Set to track teacher's schedule
    for (const item of formData.schedule) {
        // Key for classroom conflict: day-period-classroom
        const classroomKey = `${item.dayOfWeek}-${item.period}-${item.classroom}`;
        if (scheduleEntries.has(classroomKey)) {
            toast.error(`Lỗi: Phòng học bị trùng lịch trong cùng một lớp.`);
            return;
        }
        scheduleEntries.add(classroomKey);

        // NEW: Key for teacher conflict: day-period
        const teacherKey = `${item.dayOfWeek}-${item.period}`;
        if (teacherScheduleEntries.has(teacherKey)) {
            toast.error(`Lỗi: Giảng viên bị trùng lịch dạy (cùng Thứ, cùng Ca) trong chính lớp học này.`);
            return;
        }
        teacherScheduleEntries.add(teacherKey);
    }
    // --- END of NEW: Internal Conflict Checking ---

    // Validate that at least one classroom is selected in the schedule
    if (formData.schedule.some(s => !s.classroom)) {
      toast.error('Vui lòng chọn phòng học cho tất cả các buổi học.');
      return;
    }

    const submissionData = { ...formData, classCode };
    delete submissionData.classCodePart;

    try {
      if (editingCourse) {
        // We only submit fields that can be updated
        await api.put(`/api/courses/${editingCourse._id}`, { 
          maxStudents: formData.maxStudents, 
          teacher: formData.teacher, 
          schedule: formData.schedule, 
          isActive: formData.isActive 
        });
        toast.success('Cập nhật lớp học phần thành công');
      } else {
        await api.post('/api/courses', submissionData);
        toast.success('Tạo lớp học phần thành công');
      }
      resetForm();
      triggerRefetch();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Lỗi khi lưu lớp học phần');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      subject: course.subject?._id || '',
      classCodePart: course.classCode.replace('N0', ''),
      maxStudents: course.maxStudents,
      semester: course.semester?._id || '',
      teacher: course.teacher?._id || course.teacher,
      schedule: course.schedule.map(s => ({
        dayOfWeek: s.dayOfWeek,
        period: s.period,
        classroom: s.classroom?._id || s.classroom,
      })),
      isActive: course.teacher ? course.isActive : false, // Lớp không có GV thì không thể active
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học phần này?')) {
      try {
        await api.delete(`/api/courses/${courseId}`);
        toast.success('Xóa lớp học phần thành công');
        resetForm(); // Đóng form sau khi xóa
        // Refetch courses
        triggerRefetch();
      } catch (error) {
        toast.error(error.response?.data?.msg || 'Lỗi khi xóa lớp học phần');
      }
    }
  };

  const handleClickCourse = (e, course) => {
    e.preventDefault(); // Ngăn thẻ <Link> điều hướng
    if (isTeacher || user.role === 'admin') {
      setSelectedCourseForSchedule(course);
      setShowScheduleDetailModal(true);
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      resetForm();
    }
  };

  const handleMouseMove = (e) => {
    setPopoverPosition({ x: e.clientX, y: e.clientY });
  };

  const isAllSelected = filteredCourses.length > 0 && selectedCourses.length === filteredCourses.length;

  // Filter classrooms based on selected subject's preferred room types
  const filteredClassroomsForSchedule = React.useMemo(() => {
    if (!formData.subject) {
      return classrooms; // If no subject selected, show all classrooms
    }
    const selectedSubject = subjects.find(sub => sub._id === formData.subject);
    if (!selectedSubject || !selectedSubject.preferredRoomTypes || selectedSubject.preferredRoomTypes.length === 0) {
      // If subject not found or no preferred types, default to showing only theory rooms
      return classrooms.filter(cr => cr.roomType === 'theory');
    }
    const preferredTypes = selectedSubject.preferredRoomTypes;
    return classrooms.filter(cr => preferredTypes.includes(cr.roomType));
  }, [formData.subject, subjects, classrooms]);

  // NEW: Filter teachers based on selected subject's schools
  const filteredTeachersForSubject = React.useMemo(() => {
    if (!formData.subject) {
      return teachers; // If no subject selected, show all teachers
    }
    const selectedSubject = subjects.find(sub => sub._id === formData.subject);
    if (!selectedSubject || !selectedSubject.schools || selectedSubject.schools.length === 0) {
      return teachers; // If subject not found or no schools, show all teachers
    }
    const subjectSchoolIds = selectedSubject.schools.map(s => s._id.toString());
    return teachers.filter(teacher =>
      teacher.teachingSchools && teacher.teachingSchools.some(ts => subjectSchoolIds.includes(ts._id.toString()))
    );
  }, [formData.subject, subjects, teachers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isTeacher ? 'Các lớp học phần của tôi' : 'Quản lý Lớp học phần'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isTeacher ? 'Xem và quản lý các lớp học phần bạn được phân công.' : 'Tạo, chỉnh sửa và quản lý tất cả các lớp học phần trong hệ thống.'}
        </p>
        </div>
        {!isTeacher && ( // Chỉ hiển thị các nút này cho admin
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            {selectedCourses.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
              >
                <Trash2 className="h-5 w-5" />
                Xóa ({selectedCourses.length})
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm lớp mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="semester-filter" className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select id="semester-filter" name="semester" value={filters.semester} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              {semesters.map(sem => <option key={sem._id} value={sem._id}>{sem.name} ({sem.academicYear})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select id="subject-filter" name="subject" value={filters.subject} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              <option value="">Tất cả môn học</option>
              {filteredSubjectsForDropdown.map(sub => <option key={sub._id} value={sub._id}>{sub.subjectName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="school-filter" className="block text-sm font-medium text-gray-700 mb-1">Trường/Khoa</label>
            <select id="school-filter" name="school" value={filters.school} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              <option value="">Tất cả các trường</option>
              {allSchools.map(sch => <option key={sch._id} value={sch._id}>{sch.schoolName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input id="search-term" type="text" name="searchTerm" placeholder="Tên môn, mã môn, mã lớp..." value={filters.searchTerm} onChange={handleFilterChange} className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        {isTeacher && (
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="onlyMyCourses"
              name="onlyMyCourses"
              checked={filters.onlyMyCourses}
              onChange={(e) => setFilters(prev => ({ ...prev, onlyMyCourses: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="onlyMyCourses" className="ml-2 block text-sm text-gray-900">Chỉ hiển thị lớp của tôi</label>
          </div>
        )}
      </div>

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
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowScheduleDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={handleBackdropClick}
        >
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCourse ? 'Chỉnh sửa Lớp học phần' : 'Thêm Lớp học phần mới'}
              </h3>
              <p className="text-xs text-gray-500 mb-4 -mt-2">
                <span className="font-semibold text-red-600">Chú thích:</span> Tên giảng viên (số*), với * là số lớp học phần đã được phân công.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Môn học</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required disabled={!!editingCourse}>
                      <option value="">Chọn môn học</option>
                      {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.subjectName} ({sub.subjectCode})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mã lớp</label>
                    <div className="mt-1 flex items-center gap-1">
                        <span className="text-gray-500">N0</span>
                        <input
                          type="text"
                          value={formData.classCodePart}
                          onChange={(e) => setFormData({ ...formData, classCodePart: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1" required disabled={!!editingCourse} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sĩ số tối đa</label>
                    <input type="number" min="1" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Học kỳ</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required disabled={!!editingCourse}>
                      <option value="">Chọn học kỳ</option>
                      {semesters.map(sem => <option key={sem._id} value={sem._id}>{sem.name} ({sem.academicYear})</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giảng viên</label>
                  <select value={formData.teacher} onChange={(e) => setFormData({ ...formData, teacher: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Tạm thời chưa có giảng viên</option>
                    {filteredTeachersForSubject.map(t => (
                      <option key={t._id} value={t._id}> 
                        {t.firstName} {t.lastName} ({t.assignedCourseCount ?? 0}*)
                      </option>
                    ))}
                  </select>
                  {editingCourse && (
                    <div className="mt-2 flex items-center">
                      <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        disabled={!formData.teacher}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-gray-200"
                      />
                      <label htmlFor="isActive" className={`ml-2 block text-sm ${!formData.teacher ? 'text-gray-400' : 'text-gray-900'}`}>Lớp học đang hoạt động { !formData.teacher && '(cần có giảng viên)'}</label>
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="border p-4 rounded-md bg-gray-50">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Thông tin lịch học</h4>
                  {formData.schedule.map((item, index) => (
                    <div key={index} className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                      <div className="grid grid-cols-12 gap-2 items-center mb-2">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700">Thứ</label>
                        <select value={item.dayOfWeek} onChange={(e) => handleScheduleChange(index, 'dayOfWeek', parseInt(e.target.value))} className="mt-1 input-field">
                          {Object.entries(dayOfWeekNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700">Ca học</label>
                        <select value={item.period} onChange={(e) => handleScheduleChange(index, 'period', parseInt(e.target.value))} className="mt-1 input-field">
                          {Object.entries(periodNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Phòng</label>
                        <select value={item.classroom} onChange={(e) => handleScheduleChange(index, 'classroom', e.target.value)} className="mt-1 input-field">
                          <option value="">Chọn phòng</option>
                          {filteredClassroomsForSchedule.map(cr => { // Use filtered classrooms here
                            const slotKey = `${item.dayOfWeek}-${item.period}-${cr._id}`;
                            const isOccupied = occupiedSlots.has(slotKey);
                            return (
                              <option key={cr._id} value={cr._id} disabled={isOccupied} className={isOccupied ? 'text-red-400' : ''}>{cr.roomCode} {isOccupied ? '(Đã có lịch)' : ''}</option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-end">
                        {formData.schedule.length > 1 && (
                          <button type="button" onClick={() => removeSchedule(index)} className="mt-6 p-2 text-red-500 hover:text-red-700">
                            Xóa
                          </button>
                        )}
                      </div>
                      </div>
                      {/* Hiển thị các ngày học dự kiến */}
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-semibold mb-1">Các ngày học dự kiến:</p>
                        <div className="pl-2 max-h-20 overflow-y-auto">
                          {formData.semester && item.dayOfWeek ? (
                            getDatesForDayOfWeek(formData.semester, item.dayOfWeek).map((date, dateIndex, arr) => (
                              <React.Fragment key={dateIndex}>
                                <span className="text-green-600 font-medium">{date.toLocaleDateString('vi-VN')}</span>
                                {dateIndex < arr.length - 1 && <span className="text-gray-500">, </span>}
                              </React.Fragment>
                            ))
                          ) : <span className="text-gray-400">Vui lòng chọn học kỳ và thứ...</span>}
                        </div>
                      </div>

                    </div>
                  ))}
                  <button type="button" onClick={addSchedule} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                    + Thêm lịch học
                  </button>
                </div>
                <div className="flex justify-between items-center pt-4">
                    <div>
                        {editingCourse && (
                            <button type="button" onClick={() => handleDelete(editingCourse._id)} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                                Xóa
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">Hủy</button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                            {editingCourse ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </div>
              </form>
            </div>
          </div>
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
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowScheduleDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
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
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowScheduleDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Note Popover */}
      {statusNote && (
        <div
          className="fixed max-w-xs bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 z-50 pointer-events-none"
          style={{
            top: `${popoverPosition.y + 15}px`,
            left: `${popoverPosition.x + 15}px`,
            transform: popoverPosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'none',
          }}
        >
          {statusNote}
        </div>
      )}


      {/* Hover Popover */}
      {hoveredCourseId && (() => {
          const course = courses.find(c => c._id === hoveredCourseId);
          if (!course) return null;

          return (
              <div
                  className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 pointer-events-none"
                  style={{
                      top: `${popoverPosition.y + 20}px`,
                      left: `${popoverPosition.x + 20}px`,
                  }}
              >
                  <h4 className="font-bold text-gray-800">{course.subject?.subjectName} - {course.classCode}</h4>
                  <p className="text-sm text-gray-500 border-b pb-2 mb-2">
                      {course.subject?.subjectCode} • {course.subject?.credits} tín chỉ • {course.semester?.name}
                  </p>
                  <div className="space-y-1 text-sm">
                      <p><span className="font-semibold">Giảng viên:</span> {course.teacher?.firstName} {course.teacher?.lastName}</p>
                      <p><span className="font-semibold">Sĩ số:</span> {course.currentStudents}/{course.maxStudents}</p>
                      <div>
                          <p className="font-semibold">Lịch học:</p>
                          <div className="pl-4">
                              {course.schedule.map((s, i) => (
                                  <p key={i}>- {dayOfWeekNames[s.dayOfWeek]}, {periodNames[s.period]}, P. {s.classroom?.roomCode}</p>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          );
      })()}

      <div className="bg-white shadow-md overflow-hidden sm:rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {!isTeacher && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left">
                      <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">STT</th>
                  </>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn học</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảng viên</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lịch học</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sĩ số</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCourses.map((course, index) => ( // Giữ lại dòng này
                <tr key={course._id} onDoubleClick={() => handleEdit(course)} className="hover:bg-gray-50 group cursor-pointer" onMouseEnter={() => setHoveredCourseId(course._id)} onMouseLeave={() => setHoveredCourseId(null)} onMouseMove={handleMouseMove}>
                  {!isTeacher && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox"
                          checked={selectedCourses.includes(course._id)}
                          onChange={() => handleSelectCourse(course._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{course.subject?.subjectName}</div>
                        <div className="text-sm text-gray-500">{course.subject?.subjectCode} - {course.classCode}</div> {/* Giữ lại dòng này */}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.teacher?.firstName} {course.teacher?.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.schedule.map((s, i) => (<div key={i}>{dayOfWeekNames[s.dayOfWeek]}, {periodNames[s.period]}</div>))}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{Math.max(0, course.currentStudents)}/{course.maxStudents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center" onMouseEnter={(e) => {
                        if (!course.isActive && course.notes) {
                          e.stopPropagation(); // Ngăn sự kiện lan ra hàng
                          setHoveredCourseId(null); // Ẩn popover chi tiết
                          setStatusNote(course.notes); // Hiện popover lý do
                        }
                      }}
                      onMouseLeave={() => {
                        // Khi rời khỏi ô trạng thái, hiện lại popover chi tiết
                        setStatusNote(null);
                        setHoveredCourseId(course._id);
                      }}>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {course.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleClickCourse(e, course); }} className="text-blue-600 hover:text-blue-800 font-semibold">Xem lịch</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;
