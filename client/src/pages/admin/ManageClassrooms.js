import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, X, Clock, ArrowRight, Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';

// Moved outside component to prevent re-declaration on every render
const roomTypeNames = {
    computer_lab: 'Phòng máy',
    theory: 'Lý thuyết',
    lab: 'Thực hành',
    lecture_hall: 'Giảng đường',
};

// Moved outside component
const getAuthHeaders = () => ({ headers: { 'x-auth-token': localStorage.getItem('token') } });

// Helper function to format date as "HH:mm(dd/MM)"
const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${hours}:${minutes}(${day}/${month})`;
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
        roomType: 'theory',
        capacity: '',
        isActive: true,
        notes: '',
        scheduledEvents: [], // Thay thế các trường thời gian cũ bằng một mảng
    });
    // State cho chức năng import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResults, setImportResults] = useState(null);
    // State cho xóa hàng loạt
    const [selectedClassrooms, setSelectedClassrooms] = useState([]);
    // State cho modal xác nhận mật khẩu
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);


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
            // Logic phân tích mã phòng mới và chính xác hơn
            building: classroom ? (classroom.roomCode.match(/^A(\d+)-/)?.[1] || '') : '',
            // Lấy tất cả các số giữa dấu gạch ngang và số 0 cuối cùng
            roomNumber: classroom ? (classroom.roomCode.match(/-(\d+)0\d$/)?.[1] || '') : '',
            // Lấy số cuối cùng sau số 0
            floor: classroom ? (classroom.roomCode.match(/0(\d)$/)?.[1] || '') : '',
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

        const roomCode = `A${building}-${floor}0${roomNumber}`;
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

    // --- LOGIC XÓA HÀNG LOẠT ---
    const handleSelectClassroom = (id) => {
        setSelectedClassrooms(prev => prev.includes(id) ? prev.filter(classroomId => classroomId !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedClassrooms(e.target.checked ? classrooms.map(c => c._id) : []);
    };

    const handleDeleteSelected = () => {
        if (selectedClassrooms.length === 0) return;
        setConfirmAction(() => (password) => executeDeleteSelected(password));
        setIsConfirmModalOpen(true);
    };

    const executeDeleteSelected = async (password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete('/api/classrooms', {
                ...getAuthHeaders(),
                data: { classroomIds: selectedClassrooms, password }
            });
            toast.success('Xóa thành công!', { id: toastId });
            setSelectedClassrooms([]);
            fetchClassrooms();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'Xóa thất bại.';
            toast.error(errorMsg, { id: toastId });
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    const isAllSelected = classrooms.length > 0 && selectedClassrooms.length === classrooms.length;

    // --- LOGIC CHO CHỨC NĂNG IMPORT ---
    const openImportModal = () => {
        setIsImportModalOpen(true);
        setImportFile(null);
        setImportResults(null);
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
    };

    const handleImportFileChange = (e) => {
        setImportFile(e.target.files[0]);
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.error('Vui lòng chọn một tệp để nhập.');
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);

        const toastId = toast.loading('Đang nhập dữ liệu phòng học...');
        try {
            const res = await axios.post('/api/classrooms/import', formData, {
                headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.msg, { id: toastId });
            setImportResults(res.data);
            fetchClassrooms(); // Tải lại danh sách
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Lỗi khi nhập dữ liệu.', { id: toastId });
            setImportResults(error.response?.data || { failedCount: 1, errors: [{ msg: 'Lỗi không xác định.' }] });
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
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Phòng học</h1>
                    <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý các phòng học và lịch khóa phòng.</p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {selectedClassrooms.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                        >
                            <Trash2 className="h-5 w-5" />
                            Xóa ({selectedClassrooms.length})
                        </button>
                    )}
                    <button
                        onClick={openImportModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                    >
                        <Upload className="h-5 w-5" />
                        Nhập từ CSV
                    </button>
                    <button 
                        onClick={() => openModal()} 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Thêm Phòng học
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider w-16">STT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Mã phòng</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Thông tin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Lịch khóa phòng</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-red-800 uppercase tracking-wider">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classrooms.map((room, index) => (
                                <tr key={room._id} onDoubleClick={() => openModal(room)} className={`hover:bg-gray-50 cursor-pointer ${selectedClassrooms.includes(room._id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" checked={selectedClassrooms.includes(room._id)} onChange={() => handleSelectClassroom(room._id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{room.roomCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        Loại: {roomTypeNames[room.roomType] || room.roomType} - Sức chứa: {room.capacity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {room.scheduledEvents && room.scheduledEvents.length > 0 ? (
                                            <ul className="list-none pl-0 space-y-1">
                                                {room.scheduledEvents.map((event, index) => (
                                                    <li key={index} className="flex items-center text-xs">
                                                        <Clock size={12} className="mr-2 text-blue-500 flex-shrink-0" />
                                                        <span className="font-bold">
                                                            <span className="text-red-700">{formatDateTime(event.deactivationTime)}</span>
                                                            <ArrowRight size={10} className="inline-block mx-1 text-gray-500" />
                                                            <span className="text-green-600">{formatDateTime(event.activationTime)}</span>
                                                            {event.notes && <span className="text-gray-500 ml-2 italic font-normal">({event.notes})</span>}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : 'Không có'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {room.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-6 border w-full max-w-lg shadow-lg rounded-xl bg-white">
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
                                        <button type="button" onClick={() => handleDelete(currentClassroom._id)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                            Xóa
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">
                                        Hủy
                                    </button>
                                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                                        {currentClassroom ? 'Cập nhật' : 'Tạo mới'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Nhập Phòng học từ tệp CSV
                        </h3>
                        <form onSubmit={handleImportSubmit}>
                            <div className="mb-4">
                                <label htmlFor="importFile" className="block text-sm font-medium text-gray-700">Chọn tệp CSV</label>
                                <input
                                    type="file"
                                    id="importFile"
                                    name="importFile"
                                    accept=".csv"
                                    onChange={handleImportFileChange}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    required
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Tệp phải có 5 cột: `Tòa`, `Tầng`, `Phòng`, `Loại phòng`, `Sức chứa`.
                                </p>
                            </div>

                            {importResults && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                                    <p className="text-sm font-medium text-gray-800">Kết quả nhập:</p>
                                    <p className="text-sm text-gray-700">Tổng số dòng đã xử lý: {importResults.processedCount}</p>
                                    <p className="text-sm text-green-600">Thêm thành công: {importResults.importedCount}</p>
                                    {importResults.failedCount > 0 && (
                                        <div className="text-sm text-red-600">
                                            Thất bại: {importResults.failedCount}
                                            <ul className="list-disc list-inside mt-2 text-xs">
                                                {importResults.errors.map((err, index) => (
                                                    <li key={index}>Mã phòng '{err.row.roomCode || 'không xác định'}': {err.msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={closeImportModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">Đóng</button>
                                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">Tải lên và Nhập</button>
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

export default ManageClassrooms;