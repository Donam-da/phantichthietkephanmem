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

  const clearFilters = () => {
    setFilters(prev => ({ ...prev, semester: semesters.length > 0 ? semesters[0]._id : '' }));
    setSearchTerm('');
  };

  const filteredCourses = courses.filter(course => {
    // Filter by school
    if (filters.onlyMySchoolCourses && user?.role === 'student' && user.school?._id) {
      if (!course.subject?.schools?.includes(user.school._id)) {
        return false;
      }
    }

    const term = searchTerm.toLowerCase();
    return (
      course.subject?.subjectName.toLowerCase().includes(term) ||
      course.subject?.subjectCode.toLowerCase().includes(term) ||
      (course.teacher?.firstName + " " + course.teacher?.lastName).toLowerCase().includes(term)
    );
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
                <label className="form-label">Ngành học</label>
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
          {filteredCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
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
                  <Link
                    to={`/courses/${course._id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Chi tiết
                  </Link>

                  <Link
                    to={`/courses/${course._id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Đăng ký
                  </Link>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default Courses; 