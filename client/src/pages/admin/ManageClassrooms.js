import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Clock, ArrowRight } from 'lucide-react';
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
        isActive: true,
        notes: '',
        scheduledEvents: [], // Thay thế các trường thời gian cũ bằng một mảng
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

    // Tự động làm mới danh sách phòng học mỗi 20 giây, và chỉ khi modal không mở
    useEffect(() => {
        let intervalId = null;
        if (!isModalOpen) {
            intervalId = setInterval(() => {
                fetchClassrooms();
            }, 20000); // 20000ms = 20 giây
        }

        // Dọn dẹp interval khi component bị unmount để tránh rò rỉ bộ nhớ
        return () => clearInterval(intervalId);
    }, [fetchClassrooms, isModalOpen]); // Phụ thuộc vào fetchClassrooms và isModalOpen

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || '' : value }));
    };

    const openModal = (classroom = null) => { // Giữ lại dòng này
        setCurrentClassroom(classroom);
        setFormData({
            building: classroom ? (classroom.roomCode.match(/A(\d+)/) || [])[1] || '' : '', // x
            roomNumber: classroom ? (classroom.roomCode.match(/-(\d+)/) || [])[1] || '' : '', // y
            floor: classroom ? (classroom.roomCode.match(/0(\d+)/) || [])[1] || '' : '', // z
            roomType: classroom ? classroom.roomType : 'theory',
            capacity: classroom ? classroom.capacity : '',
            isActive: classroom ? classroom.isActive : true,
            notes: classroom ? classroom.notes || '' : '',
            // Chuyển đổi định dạng thời gian để hiển thị trên input
            scheduledEvents: classroom ? classroom.scheduledEvents.map(e => ({
                _id: e._id, // Giữ lại _id để xóa
                deactivationTime: e.deactivationTime ? new Date(new Date(e.deactivationTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                activationTime: e.activationTime ? new Date(new Date(e.activationTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                notes: e.notes || ''
            })) : [],
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
            isActive: true,
            notes: '',
            scheduledEvents: [],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { building, floor, roomNumber, roomType, capacity } = formData;

        if (!building || !floor || !roomNumber) {
            toast.error('Vui lòng điền đủ thông tin Tòa, Tầng, Phòng.');
            return;
        }

        const roomCode = `A${building}-${roomNumber}0${floor}`; // Đổi chỗ floor và roomNumber
        const toastId = toast.loading(currentClassroom ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentClassroom) {
                const updatePayload = {
                    roomType,
                    capacity,
                    isActive: formData.isActive,
                    notes: formData.notes,
                    // Gửi mảng sự kiện đã được sắp xếp
                    scheduledEvents: formData.scheduledEvents.sort((a, b) => new Date(a.deactivationTime) - new Date(b.deactivationTime)),
                };
                await axios.put(`/api/classrooms/${currentClassroom._id}`, updatePayload, getAuthHeaders());
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
                closeModal(); // Đóng modal sau khi xóa thành công
                fetchClassrooms();
            } catch (error) {
                // IMPROVEMENT: Provide more specific error message
                toast.error(error.response?.data?.msg || 'Xóa thất bại. Phòng học có thể đang được sử dụng.', { id: toastId });
            }
        }
    };

    // --- Các hàm quản lý sự kiện hẹn giờ ---
    const addScheduledEvent = () => {
        const formatForInput = (date) => {
            if (!date) return '';
            const d = new Date(date);
            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
            return localDate.toISOString().slice(0, 16);
        };
    
        // Xác định thời gian gốc để tính toán cho sự kiện mới
        const lastEvent = formData.scheduledEvents.length > 0
            ? formData.scheduledEvents[formData.scheduledEvents.length - 1]
            : null;

        // Nếu có sự kiện trước đó, lấy thời gian mở lại của nó làm mốc. Nếu không, lấy thời gian hiện tại.
        const baseTime = lastEvent && lastEvent.activationTime
            ? new Date(lastEvent.activationTime)
            : new Date();
    
        // Thời gian khóa = thời gian gốc + 1 giờ
        const newDeactivationTime = new Date(baseTime.getTime() + 2 * 60 * 1000);
        // Thời gian mở lại = thời gian khóa + 30 phút
        const newActivationTime = new Date(newDeactivationTime.getTime() + 30 * 60 * 1000);
    
        const newEvent = {
            deactivationTime: formatForInput(newDeactivationTime),
            activationTime: formatForInput(newActivationTime),
            notes: '' // Bỏ ghi chú mặc định, để người dùng tự điền nếu cần
        };
    
        setFormData(prev => ({
            ...prev,
            scheduledEvents: [...prev.scheduledEvents, newEvent]
        }));
    };

    const handleEventChange = (index, field, value) => {
        const newEvents = [...formData.scheduledEvents];
        newEvents[index][field] = value;
        setFormData(prev => ({ ...prev, scheduledEvents: newEvents }));
    };

    const removeScheduledEvent = (index) => {
        setFormData(prev => ({ ...prev, scheduledEvents: prev.scheduledEvents.filter((_, i) => i !== index) }));
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
                            <li
                                key={room._id}
                                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                onDoubleClick={() => openModal(room)}
                            >
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">{room.roomCode}</p>
                                    <p className="text-sm text-gray-500">
                                        Loại: {roomTypeNames[room.roomType] || room.roomType} - Sức chứa: {room.capacity}
                                    </p>
                                    {room.scheduledEvents && room.scheduledEvents.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs font-semibold text-gray-500">Lịch khóa phòng:</p>
                                            <ul className="list-none pl-0 space-y-1">
                                                {room.scheduledEvents.map((event, index) => (
                                                    <li key={index} className="flex items-center text-xs text-gray-700">
                                                        <Clock size={12} className="mr-2 text-blue-500 flex-shrink-0" />
                                                        <span>{new Date(event.deactivationTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} <ArrowRight size={10} className="inline-block mx-1" /> {new Date(event.activationTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} {event.notes && <span className="text-gray-500 ml-2 italic">({event.notes})</span>}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {!room.isActive && room.notes && (
                                        <p className="text-xs text-red-500 mt-1">Lý do khóa: {room.notes}</p>
                                    )}
                                    {room.isActive && room.notes && (
                                        <p className="text-xs text-gray-400 mt-1">Hành động trước đó: {room.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} onClick={(e) => e.stopPropagation()}>
                                        {room.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                    </span>
                                    {/* Chức năng xóa đã được chuyển vào form chỉnh sửa */}
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

                            {currentClassroom && (
                                <>
                                    <div className="border-t pt-4">
                                        <label className="block text-sm font-medium text-gray-700">Trạng thái phòng học</label>
                                        <div className="mt-2 flex items-center">
                                            <input id="isActive" name="isActive" type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                                {formData.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                                            </label>
                                        </div>
                                    </div>
                                    {!formData.isActive && (
                                        <div>
                                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ghi chú (Lý do khóa)</label>
                                            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="mt-1 input-field" placeholder="Nhập lý do khóa phòng..."></textarea>
                                        </div>
                                    )}
                                </>
                            )}

                            {currentClassroom && (
                                <>
                                    <div className="border-t pt-4 space-y-4">
                                        <h4 className="text-md font-medium text-gray-800">Lên lịch thay đổi trạng thái</h4>
                                        {formData.scheduledEvents.map((event, index) => (
                                            <div key={index} className="p-3 bg-gray-50 rounded-md border space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium text-gray-700">Sự kiện #{index + 1}</label>
                                                    <button type="button" onClick={() => removeScheduledEvent(index)} className="text-red-500 hover:text-red-700 text-sm">Xóa</button>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600">Thời gian khóa</label>
                                                        <input type="datetime-local" value={event.deactivationTime} onChange={(e) => handleEventChange(index, 'deactivationTime', e.target.value)} className="mt-1 input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600">Thời gian mở lại</label>
                                                        <input type="datetime-local" value={event.activationTime} onChange={(e) => handleEventChange(index, 'activationTime', e.target.value)} className="mt-1 input-field" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600">Ghi chú</label>
                                                    <input type="text" placeholder="Tự động khóa để bảo trì..." value={event.notes} onChange={(e) => handleEventChange(index, 'notes', e.target.value)} className="mt-1 input-field" />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addScheduledEvent} className="text-sm text-blue-600 hover:text-blue-800">+ Thêm lịch trình</button>
                                    </div>
                                </>
                            )}


                            <div className="flex justify-between items-center pt-4">
                                <div>
                                    {currentClassroom && (
                                        <button type="button" onClick={() => handleDelete(currentClassroom._id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                            Xóa
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                        Hủy
                                    </button>
                                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                        {currentClassroom ? 'Cập nhật' : 'Tạo mới'}
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

export default ManageClassrooms;