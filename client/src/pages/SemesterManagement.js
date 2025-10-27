import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const start = String(currentYear).slice(-2);
    const end = String(currentYear + 1).slice(-2);
    return { start, end };
};

const SemesterManagement = () => {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const nameInputRef = useRef(null);
  const initialYear = getCurrentAcademicYear();
  const [formData, setFormData] = useState({
    code: '',
    namePart: '', // New state for the part of the name user types
    // academicYear is now split
    academicYearStart: initialYear.start,
    academicYearEnd: initialYear.end,
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    withdrawalDeadline: '',
    maxCreditsPerStudent: 16,
    minCreditsPerStudent: 8,
    description: ''
  });

  // Effect to auto-generate semester code
  useEffect(() => {
    const { namePart, academicYearStart, academicYearEnd } = formData;
    if (namePart && academicYearStart && academicYearEnd) {
      const newCode = `HK${namePart}_20${academicYearStart}_20${academicYearEnd}`;
      setFormData(prev => ({ ...prev, code: newCode }));
    }
  }, [formData.namePart, formData.academicYearStart, formData.academicYearEnd]);

  const fetchSemesters = useCallback(async () => {
    try {
      const response = await api.get('/api/semesters');
      setSemesters(response.data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Khi ngày bắt đầu thay đổi, tự động cập nhật các ngày khác
    if (name === 'startDate' && value) {
      try {
        const startDate = new Date(value);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 70); // +70 ngày
        newFormData.endDate = endDate.toISOString().split('T')[0];

        const registrationStartDate = new Date(startDate);
        registrationStartDate.setDate(startDate.getDate() - 25); // -25 ngày
        newFormData.registrationStartDate = registrationStartDate.toISOString().split('T')[0];

        const registrationEndDate = new Date(registrationStartDate);
        registrationEndDate.setDate(registrationStartDate.getDate() + 10); // +10 ngày
        newFormData.registrationEndDate = registrationEndDate.toISOString().split('T')[0];
      } catch (error) {
        console.error("Lỗi định dạng ngày tháng:", error);
      }
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Combine year parts into academicYear
    const academicYear = `20${formData.academicYearStart}-20${formData.academicYearEnd}`;
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
        toast.error('Năm học không hợp lệ. Vui lòng nhập 2 chữ số cho mỗi năm.');
        return;
    }

    // Combine name parts
    const name = `Học kỳ ${formData.namePart}`;

    // Auto-determine semesterNumber from namePart
    let semesterNumber;
    const namePartLower = String(formData.namePart).toLowerCase();
    if (namePartLower.includes('1') || namePartLower.includes('một')) {
        semesterNumber = 1;
    } else if (namePartLower.includes('2') || namePartLower.includes('hai')) {
        semesterNumber = 2;
    } else if (namePartLower.includes('hè') || namePartLower.includes('phụ')) {
        semesterNumber = 3;
    } else semesterNumber = 1; // Default to 1 if not determined

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('Ngày bắt đầu học kỳ phải trước ngày kết thúc.');
      return;
    }
    if (new Date(formData.registrationStartDate) >= new Date(formData.registrationEndDate)) {
      toast.error('Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký.');
      return;
    }
    if (new Date(formData.withdrawalDeadline) >= new Date(formData.endDate)) {
      toast.error('Hạn chót rút môn phải trước ngày kết thúc học kỳ.');
      return;
    }

    const submissionData = { ...formData, academicYear, name, semesterNumber };
    delete submissionData.namePart;
    delete submissionData.academicYearStart;
    delete submissionData.academicYearEnd;

    try {
      if (editingSemester) {
        await api.put(`/api/semesters/${editingSemester._id}`, submissionData);
        toast.success('Cập nhật học kỳ thành công');
      } else {
        await api.post('/api/semesters', submissionData);
        toast.success('Tạo học kỳ thành công');
      }
      setShowForm(false);
      setEditingSemester(null);
      const newYear = getCurrentAcademicYear();
      setFormData({
        code: '',
        namePart: '',
        academicYearStart: newYear.start,
        academicYearEnd: newYear.end,
        startDate: '',
        endDate: '',
        registrationStartDate: '',
        registrationEndDate: '',
        withdrawalDeadline: '',
        maxCreditsPerStudent: 16,
        minCreditsPerStudent: 8,
        description: ''
      });
      fetchSemesters();
    } catch (error) {
      toast.error('Lỗi khi lưu học kỳ');
    }
  };

  const handleEdit = (semester) => {
    setEditingSemester(semester);
    const yearParts = semester.academicYear.split('-');
    setFormData({
      code: semester.code,
      namePart: semester.name.replace('Học kỳ ', ''),
      academicYearStart: yearParts[0] ? String(yearParts[0]).slice(-2) : '',
      academicYearEnd: yearParts[1] ? String(yearParts[1]).slice(-2) : '',
      startDate: semester.startDate ? new Date(semester.startDate).toISOString().split('T')[0] : '',
      endDate: semester.endDate ? new Date(semester.endDate).toISOString().split('T')[0] : '',
      registrationStartDate: semester.registrationStartDate ? new Date(semester.registrationStartDate).toISOString().split('T')[0] : '',
      registrationEndDate: semester.registrationEndDate ? new Date(semester.registrationEndDate).toISOString().split('T')[0] : '',
      withdrawalDeadline: semester.withdrawalDeadline ? new Date(semester.withdrawalDeadline).toISOString().split('T')[0] : '',
      maxCreditsPerStudent: semester.maxCreditsPerStudent || 16,
      minCreditsPerStudent: semester.minCreditsPerStudent || 8,
      description: semester.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học kỳ này? Thao tác này không thể hoàn tác.')) {
        const toastId = toast.loading('Đang xóa...');
        try {
            await api.delete(`/api/semesters/${id}`);
            toast.success('Xóa học kỳ thành công!', { id: toastId });
            setShowForm(false);
            setEditingSemester(null);
            fetchSemesters();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa học kỳ.', { id: toastId });
        }
    }
  };

  const handleActivate = async (semesterId) => {
    try {
      await api.put(`/api/semesters/${semesterId}/activate`);
      toast.success('Kích hoạt học kỳ thành công');
      fetchSemesters();
    } catch (error) {
      toast.error('Lỗi khi kích hoạt học kỳ');
    }
  };

  const openNewSemesterForm = () => {
    setEditingSemester(null);
    const newYear = getCurrentAcademicYear();
    
    // Semester dates
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 70); // Semester ends 10 weeks after it starts

    // Registration dates
    const registrationStartDate = new Date(startDate);
    registrationStartDate.setDate(startDate.getDate() - 25); // Registration starts 25 days before semester
    const registrationEndDate = new Date(registrationStartDate);
    registrationEndDate.setDate(registrationStartDate.getDate() + 10); // Registration ends 10 days after it starts

    // Withdrawal deadline (5 weeks after start date, which is 1/2 of the semester)
    const withdrawalDeadline = new Date(startDate);
    withdrawalDeadline.setDate(startDate.getDate() + 35); // 5 weeks * 7 days

    setFormData({
      code: '',
      namePart: '',
      academicYearStart: newYear.start,
      academicYearEnd: newYear.end,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0], // Mặc định là 10 tuần sau
      registrationStartDate: registrationStartDate.toISOString().split('T')[0],
      registrationEndDate: registrationEndDate.toISOString().split('T')[0],
      withdrawalDeadline: withdrawalDeadline.toISOString().split('T')[0],
      maxCreditsPerStudent: 16,
      minCreditsPerStudent: 8,
      description: ''
    });
    setShowForm(true);
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Quản lý học kỳ</h1>
        <button
          onClick={openNewSemesterForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Thêm học kỳ mới
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSemester ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ mới'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên học kỳ</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 whitespace-nowrap">Học kỳ</span>
                      <input
                        type="text"
                        value={formData.namePart}
                        ref={nameInputRef}
                        onChange={(e) => setFormData({ ...formData, namePart: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mã học kỳ</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: HK1_2024_2025"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700 whitespace-nowrap">Năm học:</label>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-500">20</span>
                        <input
                          type="text"
                          value={formData.academicYearStart}
                          onChange={(e) => setFormData({ ...formData, academicYearStart: e.target.value })}
                          className="mt-1 block w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength="2" required
                        />
                        <span className="text-gray-500">-20</span>
                        <input
                          type="text"
                          value={formData.academicYearEnd}
                          onChange={(e) => setFormData({ ...formData, academicYearEnd: e.target.value })}
                          className="mt-1 block w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength="2" required
                        />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tín chỉ tối đa</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.maxCreditsPerStudent}
                      onChange={(e) => setFormData({ ...formData, maxCreditsPerStudent: parseInt(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tín chỉ tối thiểu</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.minCreditsPerStudent}
                      onChange={(e) => setFormData({ ...formData, minCreditsPerStudent: parseInt(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      name="startDate"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      name="endDate"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bắt đầu đăng ký</label>
                    <input
                      type="date"
                      value={formData.registrationStartDate}
                      name="registrationStartDate"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kết thúc đăng ký</label>
                    <input
                      type="date"
                      value={formData.registrationEndDate}
                      name="registrationEndDate"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hạn chót rút môn</label>
                    <input
                      type="date"
                      value={formData.withdrawalDeadline}
                      name="withdrawalDeadline"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mô tả (tùy chọn)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Mô tả về học kỳ này..."
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                    <div>
                        {editingSemester && (
                            <button type="button" onClick={() => handleDelete(editingSemester._id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Xóa
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditingSemester(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Hủy
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            {editingSemester ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {semesters.map((semester) => (
            <li key={semester._id} onClick={() => handleEdit(semester)} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {semester.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Năm học: {semester.academicYear} • Học kỳ {semester.semesterNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        Từ {new Date(semester.startDate).toLocaleDateString('vi-VN')} đến {new Date(semester.endDate).toLocaleDateString('vi-VN')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Đăng ký: {new Date(semester.registrationStartDate).toLocaleDateString('vi-VN')} - {new Date(semester.registrationEndDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {semester.isCurrent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Học kỳ hiện tại
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${semester.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {semester.isActive ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!semester.isCurrent && (
                    <button
                      onClick={() => handleActivate(semester._id)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Kích hoạt
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SemesterManagement;
