import React, { useState, useEffect, useCallback } from 'react';
import { Plus, UserPlus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const ManageTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { 'x-auth-token': token } };
    };

    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/users?role=teacher', getAuthHeaders());
            setTeachers(res.data.users);
        } catch (error) {
            toast.error('Không thể tải danh sách giảng viên.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (teacher = null) => {
        setCurrentTeacher(teacher);
        setFormData({
            fullName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
            email: teacher ? teacher.email : '',
            password: '', // Luôn để trống mật khẩu khi mở modal
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTeacher(null);
        setFormData({ fullName: '', email: '', password: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = { ...formData, role: 'teacher' };
        if (currentTeacher && !payload.password) {
            delete payload.password; // Không gửi mật khẩu nếu không thay đổi
        }

        if (!currentTeacher && !payload.password) {
            toast.error('Vui lòng nhập mật khẩu khi tạo mới.');
            return;
        }

        const toastId = toast.loading(currentTeacher ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentTeacher) {
                await axios.put(`/api/users/${currentTeacher._id}`, payload, getAuthHeaders());
            } else {
                await axios.post('/api/users', payload, getAuthHeaders());
            }
            toast.success(currentTeacher ? 'Cập nhật thành công!' : 'Thêm mới thành công!', { id: toastId });
            fetchTeachers();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Đã có lỗi xảy ra.', { id: toastId });
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa giảng viên này?')) {
            const toastId = toast.loading('Đang xóa...');
            try {
                await axios.delete(`/api/users/${id}`, getAuthHeaders());
                toast.success('Xóa thành công!', { id: toastId });
                closeModal(); // Đóng modal sau khi xóa
                fetchTeachers();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Xóa thất bại.', { id: toastId });
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Giảng viên</h1>
                    <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý tài khoản giảng viên trong hệ thống.</p>
                </div>
                <button 
                    onClick={() => openModal()} 
                    className="mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                >
                    <UserPlus className="h-5 w-5" />
                    Thêm Giảng viên
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {teachers.map((teacher) => (
                                <tr key={teacher._id} onClick={() => openModal(teacher)} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.firstName} {teacher.lastName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{teacher.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Edit className="h-5 w-5 text-gray-400" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            {currentTeacher ? 'Chỉnh sửa Giảng viên' : 'Thêm Giảng viên mới'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                             <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 input-field" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 input-field" required disabled={!!currentTeacher} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="mt-1 input-field" placeholder={currentTeacher ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} required={!currentTeacher} />
                            </div>
                            <div className="flex items-center justify-between mt-6">
                                <div>
                                    {currentTeacher && (
                                        <button type="button" onClick={() => handleDelete(currentTeacher._id)} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                                            Xóa giảng viên
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-3">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">
                                        Hủy
                                    </button>
                                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                                        Lưu
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTeachers;