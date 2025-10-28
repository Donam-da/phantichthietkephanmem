import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';

const ManageTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allSchools, setAllSchools] = useState([]); // NEW: State to store all schools
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        isActive: true,
        teachingSchools: [], // NEW: Add teachingSchools to formData
    });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResults, setImportResults] = useState(null);
    const [isImporting, setIsImporting] = useState(false); // State for import loading
    const [selectedTeachers, setSelectedTeachers] = useState([]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { 'x-auth-token': token } };
    };

    // NEW: Fetch all schools
    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/users?role=teacher&populateSchools=true', getAuthHeaders());
            setTeachers(res.data.users);
        } catch (error) {
            toast.error('Không thể tải danh sách giảng viên.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    const fetchAllSchools = useCallback(async () => {
        try {
            const res = await axios.get('/api/schools', getAuthHeaders());
            setAllSchools(res.data);
        } catch (error) {
            toast.error('Không thể tải danh sách trường.');
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchAllSchools(); // NEW: Fetch all schools on mount
    }, [fetchTeachers, fetchAllSchools]);




    const normalizeText = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d");
    };

    const filteredTeachers = teachers.filter(teacher => {
        const normalizedSearchTerm = normalizeText(searchTerm);
        const normalizedFullName = normalizeText(`${teacher.firstName} ${teacher.lastName}`);
        const normalizedEmail = normalizeText(teacher.email);
        return normalizedFullName.includes(normalizedSearchTerm) || normalizedEmail.includes(normalizedSearchTerm);
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // NEW: Handle multi-select for teachingSchools
    const handleTeachingSchoolChange = (schoolId) => {
        setFormData(prev => {
            const newSchools = prev.teachingSchools.includes(schoolId)
                ? prev.teachingSchools.filter(id => id !== schoolId)
                : [...prev.teachingSchools, schoolId];
            return { ...prev, teachingSchools: newSchools };
        });
    };

    const openModal = (teacher = null) => {
        setCurrentTeacher(teacher);
        if (teacher) {
            setFormData({
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                email: teacher.email,
                isActive: teacher.isActive,
                password: '', // Luôn để trống mật khẩu
                teachingSchools: teacher.teachingSchools.map(s => s._id), // NEW: Populate teachingSchools
            });
        } else {
            setFormData({ firstName: '', lastName: '', email: '', password: '', isActive: true, teachingSchools: [] }); // NEW: Reset teachingSchools
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTeacher(null);
        setFormData({ firstName: '', lastName: '', email: '', password: '', isActive: true, teachingSchools: [] }); // NEW: Reset teachingSchools
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            isActive: formData.isActive,
            role: 'teacher',
            teachingSchools: formData.teachingSchools, // NEW: Include teachingSchools in payload
        };

        if (currentTeacher && !payload.password) {
            delete payload.password;
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

    const handleSelectTeacher = (id) => {
        setSelectedTeachers(prev => prev.includes(id) ? prev.filter(teacherId => teacherId !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedTeachers(e.target.checked ? filteredTeachers.map(t => t._id) : []);
    };

    const handleDeleteSelected = () => {
        if (selectedTeachers.length === 0) return;
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

    const isAllSelected = filteredTeachers.length > 0 && selectedTeachers.length === filteredTeachers.length;

    const handleDelete = (id) => {
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

    const openImportModal = () => {
        setIsImportModalOpen(true);
        setImportFile(null);
        setImportResults(null);
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
        window.location.reload();
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

        setIsImporting(true);
        try {
            const res = await axios.post('/api/users/import-teachers', formData, {
                headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
            });
            setImportResults(res.data);
            fetchTeachers(); // Tải lại danh sách giảng viên trong nền
        } catch (error) {
            setImportResults(error.response?.data || { failedCount: 1, errors: [{ msg: 'Lỗi không xác định.' }] });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Quản lý Giảng viên</h1>
                        <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý tài khoản giảng viên trong hệ thống.</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
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
                        <button
                            onClick={openImportModal}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                        >
                            <Upload className="h-5 w-5" />
                            Nhập từ CSV
                        </button>
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
                                    <th className="px-6 py-3 text-center text-xs font-medium text-red-800 uppercase tracking-wider">Trường giảng dạy</th> {/* NEW: Column for teaching schools */}
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
                                        <td onDoubleClick={() => openModal(teacher)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center cursor-pointer">
                                            {teacher.teachingSchools && teacher.teachingSchools.length > 0
                                                ? teacher.teachingSchools.map(s => s.schoolCode).join(', ')
                                                : 'N/A'}
                                        </td> {/* NEW: Display teaching schools */}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Họ và tên đệm</label>
                                        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="mt-1 input-field" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tên</label>
                                        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="mt-1 input-field" required />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="text"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="mt-1 input-field" placeholder="Nhập email" required disabled={!!currentTeacher} />
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
                                {/* NEW: Multi-select for teachingSchools */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Giảng dạy tại các trường</label>
                                    <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto p-2">
                                        {allSchools.length > 0 ? (
                                            allSchools.map(school => (
                                                <div key={school._id} className="flex items-center py-1">
                                                    <input
                                                        id={`school-${school._id}`}
                                                        name="teachingSchools"
                                                        type="checkbox"
                                                        checked={formData.teachingSchools.includes(school._id)}
                                                        onChange={() => handleTeachingSchoolChange(school._id)}
                                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <label htmlFor={`school-${school._id}`} className="ml-3 block text-sm text-gray-700">{school.schoolName} ({school.schoolCode})</label>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500">Không có trường nào để chọn.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-6">
                                    <div>
                                        {currentTeacher && (
                                            <button type="button" onClick={() => handleDelete(currentTeacher._id)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
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
                    title="Xác nhận hành động"
                    message="Hành động này không thể hoàn tác. Vui lòng nhập mật khẩu của bạn để xác nhận."
                    isLoading={isConfirming}
                />
                {isImportModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                Nhập Giảng viên từ tệp CSV
                            </h3>
                        {!importResults ? (
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
                                        Các cột: `Họ và tên`, `email`, `mật khẩu`, `Trường giảng dạy` (tùy chọn). Các mã trường cách nhau bởi dấu chấm phẩy (;).
                                    </p>
                                    </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={closeImportModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">Đóng</button>
                                    <button type="submit" disabled={isImporting || !importFile} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50">
                                        {isImporting ? 'Đang xử lý...' : 'Tải lên và Nhập'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div className="p-4 bg-gray-50 rounded-md border max-h-64 overflow-y-auto">
                                    <p className="text-sm font-medium text-gray-800">Kết quả nhập:</p>
                                    <p className="text-sm text-gray-700 mt-2">Tổng số dòng đã xử lý: {importResults.processedCount}</p>
                                    <p className="text-sm text-green-600">Thêm thành công: {importResults.importedCount}</p>
                                    {importResults.failedCount > 0 && (
                                        <div className="text-sm text-red-600 mt-2">
                                            Thất bại: {importResults.failedCount}
                                            <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                                                {importResults.errors.map((err, index) => (
                                                    <li key={index}>Email '{err.row.email || 'không xác định'}': {err.msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button type="button" onClick={closeImportModal} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">Thoát</button>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ManageTeachers;
