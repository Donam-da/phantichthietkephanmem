import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';

const ManageTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTeachers, setFilteredTeachers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        isActive: true,
    });
    // State cho modal xác nhận mật khẩu
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);

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

    // Lọc danh sách giảng viên khi người dùng nhập vào ô tìm kiếm
    useEffect(() => {
        // Hàm chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu, chữ hoa/thường và chữ 'Đ'
        const normalizeText = (str) => { 
            return str
                .toLowerCase() // 1. Chuyển tất cả về chữ thường
                .replace(/đ/g, "d") // 2. Chuyển 'đ' thành 'd'
                .normalize("NFD") // Tách dấu ra khỏi chữ
                .replace(/[\u0300-\u036f]/g, ""); // 3. Bỏ các dấu thanh
        };

        const normalizedSearchTerm = normalizeText(searchTerm);
        const filteredData = teachers.filter(teacher => {
            const normalizedFullName = normalizeText(`${teacher.firstName} ${teacher.lastName}`);
            const normalizedEmail = normalizeText(teacher.email);
            return normalizedFullName.includes(normalizedSearchTerm) || normalizedEmail.includes(normalizedSearchTerm);
        });

        setFilteredTeachers(filteredData);
    }, [searchTerm, teachers]);



    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'email') {
            // Loại bỏ dấu và khoảng trắng khỏi giá trị nhập vào
            const sanitizedValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '');

            // Lấy phần trước ký tự @
            const username = sanitizedValue.split('@')[0];

            // Khi tạo mới, tự động điền mật khẩu. Khi chỉnh sửa, chỉ cập nhật email.
            setFormData(prev => ({
                ...prev,
                email: sanitizedValue,
                password: !currentTeacher ? username : prev.password
            }));
        } else {
            // Đối với các ô nhập liệu khác, cập nhật bình thường
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const openModal = (teacher = null) => {
        setCurrentTeacher(teacher);
        if (teacher) {
            // Chế độ chỉnh sửa: điền thông tin của giảng viên
            setFormData({
                fullName: `${teacher.firstName} ${teacher.lastName}`,
                email: teacher.email,
                isActive: teacher.isActive,
                password: '', // Luôn để trống mật khẩu
            });
        } else {
            // Chế độ thêm mới: xóa sạch tất cả các trường
            setFormData({ fullName: '', email: '', password: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTeacher(null);
        // Reset toàn bộ form data về trạng thái ban đầu để không lưu lại dữ liệu cũ
        setFormData({
            fullName: '',
            firstName: '', // Thêm reset cho firstName
            lastName: '',  // Thêm reset cho lastName
            email: '',
            password: '',
            isActive: true
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Tách fullName thành firstName và lastName
        const nameParts = formData.fullName.trim().split(' ');
        const lastName = nameParts.pop();
        const firstName = nameParts.join(' ');

        // Tự động thêm đuôi @gmail.com nếu người dùng không nhập đầy đủ
        let finalEmail = formData.email.trim();
        if (finalEmail && !finalEmail.includes('@')) {
            finalEmail += '@gmail.com';
        }

        const payload = {
            firstName,
            lastName,
            email: finalEmail,
            password: formData.password,
            isActive: formData.isActive,
            role: 'teacher'
        };



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

    // --- LOGIC MỚI: Xử lý chọn và xóa hàng loạt ---
    const [selectedTeachers, setSelectedTeachers] = useState([]);

    const handleSelectTeacher = (id) => {
        setSelectedTeachers(prev => prev.includes(id) ? prev.filter(teacherId => teacherId !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedTeachers(e.target.checked ? teachers.map(t => t._id) : []);
    };

    const handleDeleteSelected = async () => {
        const count = selectedTeachers.length;
        if (count === 0) return;
        setConfirmAction(() => (password) => executeDeleteSelected(password));
        setIsConfirmModalOpen(true);
    };

    const executeDeleteSelected = async (password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete('/api/users', {
                ...getAuthHeaders(),
                data: { userIds: selectedTeachers, password }
            });
            toast.success('Xóa thành công!', { id: toastId });
            setSelectedTeachers([]);
            fetchTeachers();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    const isAllSelected = teachers.length > 0 && selectedTeachers.length === teachers.length;
    // --- KẾT THÚC LOGIC MỚI ---

    const handleDelete = async (id) => {
        setConfirmAction(() => (password) => executeDelete(id, password));
        setIsConfirmModalOpen(true);
    };

    const executeDelete = async (id, password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete(`/api/users/${id}`, { ...getAuthHeaders(), data: { password } });
            toast.success('Xóa thành công!', { id: toastId });
            closeModal();
            fetchTeachers();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Giảng viên</h1>
                    <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý tài khoản giảng viên trong hệ thống.</p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {/* Ô tìm kiếm */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10 w-full sm:w-64"
                        />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 mb-4">
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {selectedTeachers.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                        >
                            <Trash2 className="h-5 w-5" />
                            Xóa ({selectedTeachers.length})
                        </button>
                    )}
                    <button onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                        <UserPlus className="h-5 w-5" />
                        Thêm Giảng viên
                    </button>
                </div>
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
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        onChange={handleSelectAll}
                                        checked={isAllSelected}
                                    />
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-red-800 uppercase tracking-wider">Họ và tên</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-red-800 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-red-800 uppercase tracking-wider">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher._id} className={`hover:bg-gray-50 ${selectedTeachers.includes(teacher._id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" checked={selectedTeachers.includes(teacher._id)} onChange={() => handleSelectTeacher(teacher._id)} />
                                    </td>
                                    <td onDoubleClick={() => openModal(teacher)} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center cursor-pointer">{teacher.firstName} {teacher.lastName}</td>
                                    <td onDoubleClick={() => openModal(teacher)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center cursor-pointer">{teacher.email}</td>
                                    <td onDoubleClick={() => openModal(teacher)} className="px-6 py-4 whitespace-nowrap text-center cursor-pointer">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {teacher.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                                        </span>
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
                                <input 
                                    type="text" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleInputChange} 
                                    onFocus={(e) => {
                                        // Khi thêm mới, xóa trắng ô email và mật khẩu khi focus
                                        if (!currentTeacher) {
                                            setFormData(prev => ({ ...prev, email: '', password: '' }));
                                        } else {
                                            e.target.select(); // Khi chỉnh sửa, chỉ bôi đen
                                        }
                                    }}
                                    className="mt-1 input-field" placeholder="Nhập email hoặc chỉ cần tên" required disabled={!!currentTeacher} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="mt-1 input-field" placeholder={currentTeacher ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} required={!currentTeacher} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                                <div className="mt-2 flex items-center">
                                    <input
                                        id="isActive"
                                        name="isActive"
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">{formData.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</label>
                                </div>
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

            <ConfirmPasswordModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction}
                title="Xác nhận hành động xóa"
                message="Hành động này không thể hoàn tác. Vui lòng xác nhận để tiếp tục."
                isLoading={isConfirming}
            />
        </div>
    );
};

export default ManageTeachers;