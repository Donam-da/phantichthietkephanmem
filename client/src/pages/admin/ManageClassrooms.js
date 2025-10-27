import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// Moved outside component to prevent re-declaration on every render
const roomTypeNames = {
    computer_lab: 'Phòng máy',
    theory: 'Lý thuyết',
    lab: 'Thực hành',
    lecture_hall: 'Giảng đường',
};

// Moved outside component
const getAuthHeaders = () => ({ headers: { 'x-auth-token': localStorage.getItem('token') } });

const ManageClassrooms = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClassroom, setCurrentClassroom] = useState(null);
    const [formData, setFormData] = useState({
        building: '',
        floor: '',
        roomNumber: '',
        roomType: 'theory',
        capacity: '',
    });

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
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || '' : value }));
    };

    const openModal = (classroom = null) => {
        setCurrentClassroom(classroom);
        setFormData({
            building: classroom ? (classroom.roomCode.match(/A(\d+)/) || [])[1] || '' : '', // x
            roomNumber: classroom ? (classroom.roomCode.match(/-(\d+)/) || [])[1] || '' : '', // y
            floor: classroom ? (classroom.roomCode.match(/0(\d+)/) || [])[1] || '' : '', // z
            roomType: classroom ? classroom.roomType : 'theory',
            capacity: classroom ? classroom.capacity : '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentClassroom(null);
        setFormData({
            building: '',
            floor: '',
            roomNumber: '',
            roomType: 'theory',
            capacity: '',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { building, floor, roomNumber, roomType, capacity } = formData;

        if (!building || !floor || !roomNumber) {
            toast.error('Vui lòng điền đủ thông tin Tòa, Tầng, Phòng.');
            return;
        }

        const roomCode = `A${building}-${roomNumber}0${floor}`;
        const toastId = toast.loading(currentClassroom ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentClassroom) {
                await axios.put(`/api/classrooms/${currentClassroom._id}`, { roomType, capacity }, getAuthHeaders());
            } else {
                await axios.post('/api/classrooms', { roomCode, roomType, capacity }, getAuthHeaders());
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
                // IMPROVEMENT: Provide more specific error message
                toast.error(error.response?.data?.msg || 'Xóa thất bại. Phòng học có thể đang được sử dụng.', { id: toastId });
            }
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng học</h1>
                <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={18} />
                    Thêm Phòng học
                </button>
            </div>

            {isLoading ? <p>Đang tải...</p> : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {classrooms.map((room) => (
                            <li key={room._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">{room.roomCode}</p>
                                    <p className="text-sm text-gray-500">Loại: {roomTypeNames[room.roomType] || room.roomType} - Sức chứa: {room.capacity}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {room.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                    </span>
                                    <button onClick={() => openModal(room)} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(room._id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{currentClassroom ? 'Chỉnh sửa' : 'Thêm'} Phòng học</h3>
                            <button onClick={closeModal} className="p-1 rounded-full hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mã phòng</label>
                                <div className="grid grid-cols-3 gap-4 mt-1">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Tòa</label>
                                        <input type="number" name="building" value={formData.building} onChange={handleInputChange} className="input-field" placeholder="1" min="1" max="8" required disabled={!!currentClassroom} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Tầng</label>
                                        <input type="number" name="floor" value={formData.floor} onChange={handleInputChange} className="input-field" placeholder="1" min="1" max="7" required disabled={!!currentClassroom} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Phòng</label>
                                        <input type="number" name="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="input-field" placeholder="1" min="1" max="7" required disabled={!!currentClassroom} />
                                    </div>
                                </div>
                                {currentClassroom && <p className="text-sm text-gray-500 mt-2">Mã phòng hiện tại: {currentClassroom.roomCode}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại phòng</label>
                                    <select name="roomType" value={formData.roomType} onChange={handleInputChange} className="mt-1 input-field" required>
                                        <option value="theory">Phòng lý thuyết</option>
                                        <option value="lab">Phòng thực hành</option>
                                        <option value="computer_lab">Phòng máy</option>
                                        <option value="lecture_hall">Giảng đường</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sức chứa</label>
                                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} className="mt-1 input-field" min="1" required />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                    Hủy
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                    {currentClassroom ? 'Cập nhật' : 'Tạo mới'}
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