import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const roomTypeNames = {
    computer_lab: 'Phòng máy',
    regular: 'Phòng học thường',
    lecture_hall: 'Giảng đường',
};

const ManageClassrooms = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClassroom, setCurrentClassroom] = useState(null);
    const [formData, setFormData] = useState({
        building: '',
        floor: '',
        roomNumber: '',
        roomType: 'regular',
        capacity: '',
    });

    const getAuthHeaders = () => ({ headers: { 'x-auth-token': localStorage.getItem('token') } });

    const fetchClassrooms = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/classrooms', getAuthHeaders());
            setClassrooms(res.data);
        } catch (error) {
            toast.error('Không thể tải danh sách phòng học.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({ ...formData, [name]: type === 'number' ? parseInt(value) : value });
    };

    const openModal = (classroom = null) => {
        setCurrentClassroom(classroom);
        setFormData({
            building: classroom ? classroom.building : '',
            floor: classroom ? classroom.floor : '',
            roomNumber: classroom ? classroom.roomNumber : '',
            roomType: classroom ? classroom.roomType : 'regular',
            capacity: classroom ? classroom.capacity : '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentClassroom(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading(currentClassroom ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentClassroom) {
                await axios.put(`/api/classrooms/${currentClassroom._id}`, formData, getAuthHeaders());
            } else {
                await axios.post('/api/classrooms', formData, getAuthHeaders());
            }
            toast.success(currentClassroom ? 'Cập nhật thành công!' : 'Thêm mới thành công!', { id: toastId });
            fetchClassrooms();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Đã có lỗi xảy ra.', { id: toastId });
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa phòng học này?')) {
            const toastId = toast.loading('Đang xóa...');
            try {
                await axios.delete(`/api/classrooms/${id}`, getAuthHeaders());
                toast.success('Xóa thành công!', { id: toastId });
                fetchClassrooms();
            } catch (error) {
                toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Phòng học</h1>
                <button onClick={() => openModal()} className="btn btn-primary">
                    <Plus className="h-5 w-5 mr-2" />
                    Thêm Phòng học
                </button>
            </div>

            {isLoading ? <p>Đang tải...</p> : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Phòng</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại Phòng</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sức chứa</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classrooms.map((room) => (
                                <tr key={room._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{room.roomCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{roomTypeNames[room.roomType]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{room.capacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openModal(room)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(room._id)} className="text-red-600 hover:text-red-900">
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
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            {currentClassroom ? 'Chỉnh sửa Phòng học' : 'Thêm Phòng học mới'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tòa nhà (x)</label>
                                    <input type="number" name="building" value={formData.building} onChange={handleInputChange} className="mt-1 input-field" min="1" max="8" required disabled={!!currentClassroom} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tầng (y)</label>
                                    <input type="number" name="floor" value={formData.floor} onChange={handleInputChange} className="mt-1 input-field" min="1" max="7" required disabled={!!currentClassroom} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phòng (z)</label>
                                    <input type="number" name="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="mt-1 input-field" min="1" max="6" required disabled={!!currentClassroom} />
                                </div>
                            </div>
                            {currentClassroom && <p className="text-sm text-gray-500 mb-4">Mã phòng: {currentClassroom.roomCode}</p>}

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại phòng</label>
                                    <select name="roomType" value={formData.roomType} onChange={handleInputChange} className="mt-1 input-field" required>
                                        <option value="regular">Phòng học thường</option>
                                        <option value="computer_lab">Phòng máy</option>
                                        <option value="lecture_hall">Giảng đường</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sức chứa</label>
                                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} className="mt-1 input-field" min="1" required />
                                </div>
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

export default ManageClassrooms;