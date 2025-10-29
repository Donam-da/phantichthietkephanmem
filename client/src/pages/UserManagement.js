import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Upload, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [createFormData, setCreateFormData] = useState({ role: 'student', firstName: '', lastName: '', email: '', password: '', school: '', studentId: '', year: '', semester: '' });
  const [activeSemesters, setActiveSemesters] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  // State cho import
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSemesterId, setImportSemesterId] = useState('');
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchSchools();
    fetchActiveSemesters();
  }, []); // Thêm fetchActiveSemesters vào useEffect

  const fetchUsers = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      // Sắp xếp người dùng theo vai trò: admin > teacher > student
      const sortedUsers = (response.data.users || []).sort((a, b) => {
        const roleOrder = { admin: 1, teacher: 2, student: 3 };
        const roleA = roleOrder[a.role] || 99;
        const roleB = roleOrder[b.role] || 99;

        // Nếu cả hai đều là giảng viên, sắp xếp theo số lớp được phân công
        if (a.role === 'teacher' && b.role === 'teacher') {
          return (b.assignedCourseCount ?? 0) - (a.assignedCourseCount ?? 0);
        }

        if (roleA !== roleB) {
          return roleA - roleB;
        }
        return a.lastName.localeCompare(b.lastName); // Sắp xếp theo tên nếu cùng vai trò
      });
      setUsers(sortedUsers);
      setLoading(false);
      if (showToast) {
        toast.success('Dữ liệu đã được làm mới!');
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách người dùng');
      setLoading(false);
    }
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/api/schools');
      setSchools(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách trường.');
    }
  };

  const fetchActiveSemesters = async () => {
    try {
      const res = await api.get('/api/semesters?isActive=true');
      setActiveSemesters(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách học kỳ đang hoạt động.');
    }
  };
  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.put(`/api/users/${userId}`, { isActive: !isActive });
      toast.success('Cập nhật trạng thái thành công');
      fetchUsers();
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const openStudentDetail = async (userId) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const res = await api.get(`/api/users/${userId}`);
      setSelectedUser(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải chi tiết sinh viên');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUser(null);
  };

  const handleCreateFormChange = (e) => {
    setCreateFormData({ ...createFormData, [e.target.name]: e.target.value });
  };

  // Hàm mới để xử lý khi chọn một học kỳ
  const handleSemesterSelectionChange = (e) => {
    const selectedSemesterId = e.target.value;
    const selectedSemester = activeSemesters.find(s => s._id === selectedSemesterId);
    if (selectedSemester) {
      setCreateFormData(prev => ({
        ...prev,
        year: selectedSemester.semesterNumber, // Cập nhật năm học
        semester: selectedSemester.semesterNumber, // Cập nhật số học kỳ
      }));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Đang tạo người dùng...');
    try {
      // Tách fullName thành firstName và lastName trước khi gửi
      const { fullName, ...restOfData } = createFormData;
      const nameParts = fullName.trim().split(' ');
      const lastName = nameParts.pop() || '';
      const firstName = nameParts.join(' ');

      if (!firstName || !lastName) {
        toast.error('Vui lòng nhập họ và tên đầy đủ.', { id: toastId });
        return;
      }

      const submissionData = { ...restOfData, firstName, lastName };

      await api.post('/api/users', submissionData);

      toast.success('Tạo người dùng thành công!', { id: toastId });
      setShowCreateModal(false);
      setCreateFormData({ role: 'student', firstName: '', lastName: '', email: '', password: '', school: '', studentId: '', year: '', semester: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Lỗi khi tạo người dùng.', { id: toastId });
    }
  };

  const executeDelete = useCallback(async (userId, password) => {
    setIsConfirming(true);
    const toastId = toast.loading('Đang xóa người dùng...');
    try {
      await api.delete(`/api/users/${userId}`, { data: { password } });
      toast.success('Xóa người dùng thành công!', { id: toastId });
      closeDetailModal();
      window.location.reload(); // Tải lại toàn bộ trang
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
    } finally {
      setIsConfirming(false);
      setIsConfirmModalOpen(false);
    }
  }, []);

  const handleDeleteUser = useCallback((user) => {
    if (!user) return;
    setConfirmAction(() => (password) => executeDelete(user._id, password));
    setIsConfirmModalOpen(true);
  }, [executeDelete]);
  
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allUserIds = filteredUsers.map(user => user._id);
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers([]);
    }
  };

  const executeDeleteSelected = useCallback(async (password) => {
    setIsConfirming(true);
    const toastId = toast.loading(`Đang xóa ${selectedUsers.length} người dùng...`);
    try {
      await api.delete('/api/users', { data: { userIds: selectedUsers, password } });
      toast.success('Xóa thành công!', { id: toastId });
      setSelectedUsers([]);
      window.location.reload(); // Tải lại toàn bộ trang
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
    } finally {
      setIsConfirming(false);
      setIsConfirmModalOpen(false);
    }
  }, [selectedUsers]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedUsers.length === 0) return;
    setConfirmAction(() => (password) => executeDeleteSelected(password));
    setIsConfirmModalOpen(true);
  }, [executeDeleteSelected, selectedUsers.length]);

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Vui lòng chọn một tệp CSV.');
      return;
    }
    if (!importSemesterId) {
      toast.error('Vui lòng chọn học kỳ để áp dụng.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('semesterId', importSemesterId);

    setIsImporting(true);
    setImportResult(null); // Reset kết quả trước khi import mới
    const toastId = toast.loading('Đang import dữ liệu sinh viên...');

    try {
      const res = await api.post('/api/users/import-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(res.data.msg, { id: toastId, duration: 5000 });
      setImportResult(res.data);
      // Không đóng modal hoặc tải lại ngay để người dùng xem kết quả
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Lỗi khi import file.', { id: toastId });
    } finally {
      setIsImporting(false);
      setImportFile(null); // Reset file input
      // Không reset semesterId để người dùng có thể import tiếp file khác vào cùng học kỳ
    }
  };

  const handleRowDoubleClick = (user) => {
    // Only open detail modal for students
    if (user.role === 'student') openStudentDetail(user._id);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="btn btn-danger flex items-center gap-2"
              >
                <Trash2 size={18} />
                Xóa ({selectedUsers.length})
              </button>
            )}
            {/* Nút làm mới dữ liệu */}
            <button onClick={() => window.location.reload()} className="btn btn-secondary flex items-center gap-2" title="Làm mới dữ liệu">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="h-6 w-px bg-gray-300"></div> {/* Dải phân cách */}
            {/* Các nút Import và Tạo tài khoản sinh viên, chỉ hiển thị nếu không phải là giáo viên */}
            {/* Đã bọc trong React.Fragment để tránh lỗi cú pháp */}
            {/* isTeacher là một biến từ AuthContext, cần được truyền vào component nếu muốn sử dụng */}
            {/* Giả sử isTeacher được lấy từ useAuth() */}
            {/* {isTeacher ? null : ( */}
              <>
                <button onClick={() => setShowImportModal(true)} className="btn btn-secondary flex items-center gap-2">
                  <Upload size={18} /> Import Sinh viên
                </button>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
                  <Plus size={18} /> Tạo tài khoản sinh viên
                </button>
              </>
            {/* )} */}
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả vai trò</option>
            <option value="student">Sinh viên</option>
            <option value="teacher">Giảng viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider w-16">STT</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Thông tin người dùng</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Vai trò</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Phân công / Trường</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="relative px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider"><span className="sr-only">Hành động</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((userItem, index) => (
              <tr key={userItem._id} onDoubleClick={() => handleRowDoubleClick(userItem)} className={userItem.role === 'student' ? 'cursor-pointer hover:bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(userItem._id)}
                    onChange={() => handleSelectUser(userItem._id)}
                    onClick={(e) => e.stopPropagation()} // Ngăn double-click khi chọn checkbox
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={() => handleSelectUser(userItem._id)}>{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {userItem.firstName?.charAt(0)}{userItem.lastName?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {userItem.firstName} {userItem.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{userItem.email}</div>
                      <div className="text-sm text-gray-500">
                        {userItem.studentId && `MSSV: ${userItem.studentId}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userItem.role === 'admin' ? 'bg-red-100 text-red-800' :
                    userItem.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {userItem.role === 'admin' ? 'Quản trị viên' :
                      userItem.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userItem.role === 'teacher' && (
                    <span>
                      {userItem.assignedCourseCount ?? 0}/{userItem.teachingSchools?.map(s => s.schoolCode).join(', ') || 'N/A'}
                    </span>
                  )}
                  {userItem.role === 'student' && (
                    <span>{userItem.school?.schoolName || 'Chưa có trường'}</span>
                  )}
                  {userItem.role === 'admin' && (
                    <span>-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(userItem._id, userItem.isActive)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${userItem.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                  >
                    {userItem.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-xl bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tạo tài khoản Sinh viên mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="form-label">Họ và tên</label>
                <input type="text" name="fullName" value={createFormData.fullName} onChange={handleCreateFormChange} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" name="email" value={createFormData.email} onChange={handleCreateFormChange} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Mật khẩu</label>
                <input type="password" name="password" value={createFormData.password} onChange={handleCreateFormChange} className="input-field" required />
              </div>
              <>
                <div>
                  <label className="form-label">Mã sinh viên</label>
                  <input type="text" name="studentId" value={createFormData.studentId} onChange={handleCreateFormChange} className="input-field" required />
                </div>
                <div>
                  <label className="form-label">Trường</label>
                  <select name="school" value={createFormData.school} onChange={handleCreateFormChange} className="input-field" required>
                    <option value="">Chọn trường</option>
                    {schools.map(s => <option key={s._id} value={s._id}>{s.schoolName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Học kỳ nhập học</label>
                  <select
                    name="semesterSelection" // Tên mới cho dropdown
                    onChange={handleSemesterSelectionChange}
                    className="input-field"
                    required
                  >
                    <option value="">Chọn học kỳ</option>
                    {activeSemesters.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Import danh sách sinh viên từ CSV</h3>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="p-1 rounded-full hover:bg-gray-200">✕</button>
            </div>

            {!importResult ? (
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-blue-400 bg-blue-50 text-blue-700">
                  <p className="font-bold">Hướng dẫn:</p>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Chọn một học kỳ đang hoạt động để gán cho tất cả sinh viên trong tệp.</li>
                    <li>Tệp tải lên phải là định dạng <strong>CSV</strong>.</li>
                    <li>Các cột bắt buộc trong tệp: <strong>fullName, email, password, studentId, schoolCode, year</strong>.</li>
                    <li>Dòng đầu tiên sẽ được coi là tiêu đề và bị bỏ qua.</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Chọn học kỳ áp dụng</label>
                    <select
                      value={importSemesterId}
                      onChange={(e) => setImportSemesterId(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">-- Chọn học kỳ --</option>
                      {activeSemesters.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                  <label className="form-label">Chọn tệp CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button type="button" onClick={() => { setShowImportModal(false); setImportResult(null); setImportSemesterId(''); }} className="btn btn-secondary">Hủy</button>
                  <button onClick={handleImport} disabled={isImporting || !importFile || !importSemesterId} className="btn btn-primary">
                    {isImporting ? 'Đang xử lý...' : 'Tải lên và Tạo'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Kết quả Import</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-2xl font-bold text-gray-700">{importResult.processedCount}</p>
                    <p className="text-sm text-gray-500">Dòng đã xử lý</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{importResult.importedCount}</p>
                    <p className="text-sm text-green-600">Thêm thành công</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{importResult.failedCount}</p>
                    <p className="text-sm text-red-600">Thất bại</p>
                  </div>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-red-600 mb-2">Chi tiết lỗi:</h5>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-red-50 text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        {importResult.errors.map((err, index) => (
                          <li key={index} className="text-red-800">
                            <strong>Dòng {err.row}:</strong> {err.msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <button onClick={() => { setImportResult(null); setImportFile(null); }} className="btn btn-secondary mr-2">Import tệp khác</button>
                  <button onClick={() => { 
                    setShowImportModal(false); 
                    setImportResult(null); 
                    setImportSemesterId('');
                    fetchUsers(); // Tải lại dữ liệu khi đóng modal
                  }} className="btn btn-primary">Đóng</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-xl shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết sinh viên</h3>
              <button onClick={closeDetailModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="mt-4">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedUser ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Họ tên</span>
                    <span className="col-span-2 text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Email</span>
                    <span className="col-span-2 text-gray-900">{selectedUser.email}</span>
                  </div>
                  {selectedUser.studentId && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">MSSV</span>
                      <span className="col-span-2 text-gray-900">{selectedUser.studentId}</span>
                    </div>
                  )}
                  {selectedUser.school && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Trường</span>
                      <span className="col-span-2 text-gray-900">{selectedUser.school.schoolName}</span>
                    </div>
                  )}
                  {(selectedUser.year !== undefined || selectedUser.semester !== undefined) && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Niên khóa</span>
                      <span className="col-span-2 text-gray-900">Năm {selectedUser.year} - Học kỳ {selectedUser.semester}</span>
                    </div>
                  )}
                  {(selectedUser.currentCredits !== undefined || selectedUser.maxCredits !== undefined) && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Tín chỉ</span>
                      <span className="col-span-2 text-gray-900">
                        {selectedUser.currentCredits || 0}/
                        {activeSemesters.find(s => s.isCurrent)?.maxCreditsPerStudent || selectedUser.maxCredits || 24}
                      </span>
                    </div>
                  )}
                  {selectedUser.phone && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Điện thoại</span>
                      <span className="col-span-2 text-gray-900">{selectedUser.phone}</span>
                    </div>
                  )}
                  {selectedUser.address && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Địa chỉ</span>
                      <span className="col-span-2 text-gray-900">{selectedUser.address}</span>
                    </div>
                  )}
                  {selectedUser.dateOfBirth && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Ngày sinh</span>
                      <span className="col-span-2 text-gray-900">{new Date(selectedUser.dateOfBirth).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                  {selectedUser.gender && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500">Giới tính</span>
                      <span className="col-span-2 text-gray-900">{selectedUser.gender}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Không có dữ liệu sinh viên.</p>
              )}
            </div>
            <div className="mt-6 flex justify-between items-center">
              {selectedUser && (
                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                >
                  <Trash2 size={16} /> Xóa tài khoản
                </button>
              )}
              <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Đóng</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPasswordModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmAction}
        title="Xác nhận xóa người dùng"
        message="Hành động này không thể hoàn tác. Vui lòng nhập mật khẩu của bạn để xác nhận."
        isLoading={isConfirming}
      />
    </div>
  );
};

export default UserManagement;
