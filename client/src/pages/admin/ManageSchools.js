// client/src/pages/admin/ManageSchools.js
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
// Giả định bạn có một file api service, nếu không có thể dùng axios trực tiếp
// import api from '../../services/api'; 
import axios from 'axios';


const ManageSchools = () => {
    const [schools, setSchools] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSchool, setCurrentSchool] = useState(null);
    const [formData, setFormData] = useState({ schoolCode: '', schoolName: '' });

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa trường này?')) {
            const toastId = toast.loading('Đang xóa...');
            try {
                await axios.delete(`/api/schools/${id}`, getAuthHeaders());
                toast.success('Xóa thành công!', { id: toastId });
                fetchSchools();
            } catch (error) {
                toast.error('Xóa thất bại.', { id: toastId });
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Trường học</h1>
                <button onClick={() => openModal()} className="btn btn-primary">
                    <Plus className="h-5 w-5 mr-2" />
                    Thêm Trường mới
                </button>
            </div>

            {isLoading ? (
                <p>Đang tải...</p>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Trường</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Trường</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {schools.map((school) => (
                                <tr key={school._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{school.schoolCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.schoolName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openModal(school)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(school._id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                                    className="mt-1 input-field"
                                    disabled={!!currentSchool} // Không cho sửa mã trường
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
                            <div className="flex items-center justify-end mt-6">
                                <button type="button" onClick={closeModal} className="btn btn-secondary mr-3">
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Lưu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageSchools;
