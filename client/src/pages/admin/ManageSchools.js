// client/src/pages/admin/ManageSchools.js
import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
// Giả định bạn có một file api service, nếu không có thể dùng axios trực tiếp
// import api from '../../services/api'; 
import axios from 'axios';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';


const ManageSchools = () => {
    const [schools, setSchools] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSchool, setCurrentSchool] = useState(null);
    const [formData, setFormData] = useState({ schoolCode: '', schoolName: '' });
    // State cho xóa hàng loạt và xác nhận mật khẩu
    const [selectedSchools, setSelectedSchools] = useState([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);

    // Hàm để lấy token từ localStorage
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { 'x-auth-token': token } };
    };

    const fetchSchools = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/schools', getAuthHeaders());
            setSchools(res.data);
        } catch (error) {
            toast.error('Không thể tải danh sách trường.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Tự động chuyển mã trường thành chữ hoa
        if (name === 'schoolCode') {
            setFormData({ ...formData, [name]: value.toUpperCase() });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const openModal = (school = null) => {
        setCurrentSchool(school);
        setFormData({
            schoolCode: school ? school.schoolCode : '',
            schoolName: school ? school.schoolName : '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSchool(null);
        setFormData({ schoolCode: '', schoolName: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.schoolCode || !formData.schoolName) {
            toast.error('Vui lòng nhập đầy đủ thông tin.');
            return;
        }

        const toastId = toast.loading(currentSchool ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentSchool) {
                // Update
                await axios.put(`/api/schools/${currentSchool._id}`, formData, getAuthHeaders());
            } else {
                // Create
                await axios.post('/api/schools', formData, getAuthHeaders());
            }
            toast.success(currentSchool ? 'Cập nhật thành công!' : 'Thêm mới thành công!', { id: toastId });
            fetchSchools();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Đã có lỗi xảy ra.', { id: toastId });
        }
    };

    const handleDelete = (id) => {
        setConfirmAction(() => (password) => executeDelete(id, password));
        setIsConfirmModalOpen(true);
    };

    const executeDelete = async (id, password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete(`/api/schools/${id}`, { ...getAuthHeaders(), data: { password } });
            toast.success('Xóa thành công!', { id: toastId });
            closeModal();
            fetchSchools();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'Xóa thất bại.';
            toast.error(errorMsg, { id: toastId });
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    // --- LOGIC XÓA HÀNG LOẠT ---
    const handleSelectSchool = (id) => {
        setSelectedSchools(prev => prev.includes(id) ? prev.filter(schoolId => schoolId !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedSchools(e.target.checked ? schools.map(s => s._id) : []);
    };

    const handleDeleteSelected = () => {
        if (selectedSchools.length === 0) return;
        setConfirmAction(() => (password) => executeDeleteSelected(password));
        setIsConfirmModalOpen(true);
    };

    const executeDeleteSelected = async (password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete('/api/schools', {
                ...getAuthHeaders(),
                data: { schoolIds: selectedSchools, password }
            });
            toast.success(`Đã xóa ${selectedSchools.length} trường!`, { id: toastId });
            setSelectedSchools([]);
            fetchSchools();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'Xóa thất bại.';
            toast.error(errorMsg, { id: toastId });
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    const isAllSelected = schools.length > 0 && selectedSchools.length === schools.length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Trường học</h1>
                    <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý các trường/khoa trong hệ thống.</p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {selectedSchools.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                        >
                            <Trash2 className="h-5 w-5" />
                            Xóa ({selectedSchools.length})
                        </button>
                    )}
                    <button 
                        onClick={() => openModal()} 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Thêm Trường mới
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
                                    <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">STT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Trường</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Trường</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {schools.map((school, index) => (
                                <tr key={school._id} onDoubleClick={() => openModal(school)} className={`hover:bg-gray-50 cursor-pointer ${selectedSchools.includes(school._id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" checked={selectedSchools.includes(school._id)} onChange={() => handleSelectSchool(school._id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{school.schoolCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.schoolName}</td>
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
                            {currentSchool ? 'Chỉnh sửa Trường' : 'Thêm Trường mới'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="schoolCode" className="block text-sm font-medium text-gray-700">Mã Trường</label>
                                <input
                                    type="text"
                                    name="schoolCode"
                                    id="schoolCode"
                                    value={formData.schoolCode}
                                    onChange={handleInputChange}
                                    className="mt-1 input-field uppercase"
                                    placeholder="VD: CNTT"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">Tên Trường</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    id="schoolName"
                                    value={formData.schoolName}
                                    onChange={handleInputChange}
                                    className="mt-1 input-field"
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-between mt-6">
                                <div>
                                    {currentSchool && (
                                        <button type="button" onClick={() => handleDelete(currentSchool._id)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                            Xóa trường
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
                message="Hành động này không thể hoàn tác. Vui lòng nhập mật khẩu của bạn để xác nhận."
                isLoading={isConfirming}
            />
        </div>
    );
};

export default ManageSchools;
