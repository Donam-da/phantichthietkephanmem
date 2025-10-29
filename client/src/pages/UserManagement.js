import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [createFormData, setCreateFormData] = useState({ role: 'student', firstName: '', lastName: '', email: '', password: '', school: '', studentId: '', year: '', semester: '' });
  const [activeSemesters, setActiveSemesters] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchSchools();
    fetchActiveSemesters();
  }, []); // Thêm fetchActiveSemesters vào useEffect

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      // Sắp xếp người dùng theo vai trò: admin > teacher > student
      const sortedUsers = response.data.users.sort((a, b) => {
        const roleOrder = { admin: 1, teacher: 2, student: 3 };
        const roleA = roleOrder[a.role] || 4;
        const roleB = roleOrder[b.role] || 4;
        if (roleA !== roleB) {
          return roleA - roleB;
        }
        return a.lastName.localeCompare(b.lastName); // Sắp xếp theo tên nếu cùng vai trò
      });
      setUsers(sortedUsers);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

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
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus size={18} /> Tạo người dùng
          </button>
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">STT</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin người dùng</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((userItem, index) => (
              <tr key={userItem._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {userItem.role === 'student' && (
                    <button
                      onClick={() => openStudentDetail(userItem._id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Chi tiết
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tạo người dùng mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="form-label">Vai trò</label>
                <select name="role" value={createFormData.role} onChange={handleCreateFormChange} className="input-field">
                  <option value="student">Sinh viên</option>
                  <option value="teacher">Giảng viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
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
              {createFormData.role === 'student' && (
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
              )}
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
            <div className="mt-6 flex justify-end">
              <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
