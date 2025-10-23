import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CourseManagement = () => {
  const { user, isTeacher } = useAuth(); // Giữ lại dòng này
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredCourseId, setHoveredCourseId] = useState(null);
  const [filters, setFilters] = useState({
    semester: '',
    subject: '',
    searchTerm: '',
    onlyMyCourses: true, // New filter state for teachers
  });
  const [formData, setFormData] = useState({
    subject: '',
    classCodePart: '', // Giữ lại dòng này
    maxStudents: 50,
    semester: '',
    teacher: '',
    schedule: [{ dayOfWeek: 2, period: 1, classroom: '' }],
  });

  const dayOfWeekNames = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ Nhật' };
  const periodNames = { 1: 'Ca 1 (6h45-9h25)', 2: 'Ca 2 (9h40-12h10)', 3: 'Ca 3 (13h-15h30)', 4: 'Ca 4 (15h45-18h25)' }; // Giữ lại dòng này

  // Fetch static data like subjects, teachers, semesters, classrooms once
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const apiCalls = [
          api.get('/api/subjects'),
          api.get('/api/semesters?isActive=true'),
          api.get('/api/classrooms'),
        ];
        if (!isTeacher) {
          apiCalls.push(api.get('/api/users?role=teacher'));
        }
        const [subjectsRes, semestersRes, classroomsRes, teachersRes] = await Promise.all(apiCalls);

        setSubjects(subjectsRes.data);
        setSemesters(semestersRes.data);
        setClassrooms(classroomsRes.data);
        if (teachersRes) {
          setTeachers(teachersRes.data.users);
        }

        // Set default semester filter if not set
        if (semestersRes.data.length > 0) {
          setFilters(prev => ({ ...prev, semester: prev.semester || semestersRes.data[0]._id }));
        }
      } catch (error) {
        toast.error('Lỗi khi tải dữ liệu nền.');
      }
    };
    fetchStaticData();
  }, [isTeacher]);

  const fetchCourses = useCallback(async () => {
    if (!filters.semester) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('semester', filters.semester);
      const courseApiUrl = `/api/courses?${params.toString()}`;
      const coursesRes = await api.get(courseApiUrl);

      let fetchedCourses = coursesRes.data.courses;

      // If the user is a teacher, sort their courses to the top
      if (isTeacher) {
        fetchedCourses.sort((a, b) => {
          const isATeacherCourse = a.teacher?._id === user.id;
          const isBTeacherCourse = b.teacher?._id === user.id;
          if (isATeacherCourse && !isBTeacherCourse) return -1;
          if (!isATeacherCourse && isBTeacherCourse) return 1;
          return 0; // Keep original order for other cases
        });
      }
      setCourses(fetchedCourses);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách lớp học phần.');
    } finally {
      setLoading(false);
    }
  }, [filters.semester, isTeacher, user]);

  // Fetch courses whenever the semester filter changes
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const triggerRefetch = () => {
    setCourses([]); // Clear current courses to show loading state
    fetchCourses();
  };
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


    // --- CONFLICT CHECKING LOGIC ---
    if (!editingCourse) {
      const { teacher, semester, schedule: newSchedule } = formData;
      const coursesInSameSemester = courses.filter(c => c.semester?._id === semester);

      for (const scheduleItem of newSchedule) {
        for (const existingCourse of coursesInSameSemester) {
          for (const existingSchedule of existingCourse.schedule) {
            // Check for time slot collision
            if (scheduleItem.dayOfWeek === existingSchedule.dayOfWeek && scheduleItem.period === existingSchedule.period) {
              // 1. Teacher conflict
              if (existingCourse.teacher?._id === teacher) {
                const teacherName = teachers.find(t => t._id === teacher)?.fullName || 'Giảng viên';
                toast.error(`${teacherName} đã có lịch dạy vào ${dayOfWeekNames[scheduleItem.dayOfWeek]}, ${periodNames[scheduleItem.period]}.`);
                return;
              }
              // 2. Classroom conflict
              if (existingSchedule.classroom?._id === scheduleItem.classroom) {
                const classroomName = classrooms.find(cr => cr._id === scheduleItem.classroom)?.roomCode || 'Phòng học';
                toast.error(`Phòng ${classroomName} đã được sử dụng vào ${dayOfWeekNames[scheduleItem.dayOfWeek]}, ${periodNames[scheduleItem.period]}.`);
                return;
              }
            }
          }
        }
      }
    }
    // --- END OF CONFLICT CHECKING ---

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
        await api.put(`/api/courses/${editingCourse._id}`, { maxStudents: formData.maxStudents, teacher: formData.teacher, schedule: formData.schedule, isActive: formData.isActive });
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
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học phần này?')) {
      try {
        await api.delete(`/api/courses/${courseId}`);
        toast.success('Xóa lớp học phần thành công');
        // Refetch courses
        triggerRefetch();
      } catch (error) {
        toast.error(error.response?.data?.msg || 'Lỗi khi xóa lớp học phần');
      }
    }
  };

  const handleMouseMove = (e) => {
    setPopoverPosition({ x: e.clientX, y: e.clientY });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      resetForm();
    }
  };

  const filteredCourses = courses.filter(course => {
    // Teacher specific filter
    if (isTeacher && filters.onlyMyCourses && course.teacher?._id !== user.id) {
      return false;
    }

    const term = filters.searchTerm.toLowerCase();
    const subjectMatch = !filters.subject || course.subject?._id === filters.subject;
    const searchMatch = !term || 
      course.subject?.subjectName.toLowerCase().includes(term) ||
      course.subject?.subjectCode.toLowerCase().includes(term) ||
      course.classCode.toLowerCase().includes(term);
    return subjectMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isTeacher ? 'Các lớp học phần của tôi' : 'Quản lý Lớp học phần'}
        </h1>
        {!isTeacher && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Thêm lớp học phần
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Học kỳ</label>
            <select name="semester" value={filters.semester} onChange={handleFilterChange} className="input-field">
              {semesters.map(sem => <option key={sem._id} value={sem._id}>{sem.name} ({sem.academicYear})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Môn học</label>
            <select name="subject" value={filters.subject} onChange={handleFilterChange} className="input-field">
              <option value="">Tất cả môn học</option>
              {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.subjectName}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tìm kiếm</label>
            <input type="text" name="searchTerm" placeholder="Tên môn, mã môn, mã lớp..." value={filters.searchTerm} onChange={handleFilterChange} className="input-field" />
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
                  <select value={formData.teacher} onChange={(e) => setFormData({ ...formData, teacher: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Chọn giảng viên</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>

                {/* Schedule */}
                <div className="border p-4 rounded-md bg-gray-50">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Thông tin lịch học</h4>
                  {formData.schedule.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2">
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
                          {classrooms.map(cr => <option key={cr._id} value={cr._id}>{cr.roomCode}</option>)}
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
                  ))}
                  <button type="button" onClick={addSchedule} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                    + Thêm lịch học
                  </button>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingCourse ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredCourses.map((course) => (
            <li 
              key={course._id} 
              className="px-6 py-4 flex items-center justify-between"
              onMouseEnter={() => setHoveredCourseId(course._id)}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCourseId(null)}
            >
              <Link to={`/teacher/courses/${course._id}`} className="flex-1 flex items-center justify-between group">
                <div className="flex-1 pr-4 flex items-center gap-3">
                  {isTeacher && (
                    course.teacher?._id === user.id ? (
                      <Star className="h-5 w-5 text-yellow-400 fill-current flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 flex-shrink-0" />
                    )
                  )}
                  <div>
                    <p className="text-base font-medium text-indigo-600 truncate group-hover:underline">{course.subject?.subjectName} ({course.subject?.subjectCode})</p>
                    <p className="text-sm text-gray-500">Mã lớp: {course.classCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 ml-4">
                  <span className="text-sm text-gray-700">{course.currentStudents}/{course.maxStudents} SV</span>
                  {!isTeacher && (
                    <div className="flex flex-col items-end space-y-1">
                        <button onClick={(e) => { e.preventDefault(); handleEdit(course); }} className="text-blue-600 hover:text-blue-900 text-sm font-medium">Chỉnh sửa</button>
                        <button onClick={(e) => { e.preventDefault(); handleDelete(course._id); }} className="text-red-600 hover:text-red-900 text-sm font-medium">Xóa</button>
                    </div>
                  )}
                </div>
              </Link>

              {/* Hover Popover */}
              {hoveredCourseId === course._id && (
                <div
                  className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 pointer-events-none"
                  style={{
                    top: `${popoverPosition.y + 20}px`,
                    left: `${popoverPosition.x + 20}px`
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
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CourseManagement;
