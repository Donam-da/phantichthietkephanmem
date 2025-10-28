import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, BookOpen, Search, Upload, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';

const ManageSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [allSchools, setAllSchools] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [formData, setFormData] = useState({
        subjectCode: '',
        subjectName: '',
        credits: '',
        schools: [],
        category: 'required',
    });
    // State cho bộ lọc và tìm kiếm
    const [filters, setFilters] = useState({
        school: '',
        credits: '',
        searchTerm: '',
    });
    // State cho modal xác nhận mật khẩu và import
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    // State cho chức năng import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResults, setImportResults] = useState(null); // Để hiển thị kết quả sau khi import

    const getAuthHeaders = () => ({ headers: { 'x-auth-token': localStorage.getItem('token') } });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [subjectsRes, schoolsRes] = await Promise.all([
                axios.get('/api/subjects', getAuthHeaders()),
                axios.get('/api/schools', getAuthHeaders()),
            ]);
            setSubjects(subjectsRes.data);
            setAllSchools(schoolsRes.data);
        } catch (error) {
            toast.error('Không thể tải dữ liệu.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({ ...formData, [name]: type === 'number' ? parseInt(value) || '' : value });
    };

    const handleSchoolChange = (schoolId) => {
        setFormData(prev => {
            const newSchools = prev.schools.includes(schoolId)
                ? prev.schools.filter(id => id !== schoolId)
                : [...prev.schools, schoolId];
            return { ...prev, schools: newSchools };
        });
    };

    const handleSelectAllSchools = (e) => {
        if (e.target.checked) {
            setFormData(prev => ({ ...prev, schools: allSchools.map(s => s._id) }));
        } else {
            setFormData(prev => ({ ...prev, schools: [] }));
        }
    };

    const openModal = (subject = null) => {
        setCurrentSubject(subject);
        setFormData({
            subjectCode: subject ? subject.subjectCode : '',
            subjectName: subject ? subject.subjectName : '',
            credits: subject ? subject.credits : '',
            schools: subject ? subject.schools.map(s => s._id) : [],
            category: subject ? subject.category : 'required',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSubject(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading(currentSubject ? 'Đang cập nhật...' : 'Đang thêm mới...');
        try {
            if (currentSubject) {
                await axios.put(`/api/subjects/${currentSubject._id}`, formData, getAuthHeaders());
            } else {
                await axios.post('/api/subjects', formData, getAuthHeaders());
            }
            toast.success(currentSubject ? 'Cập nhật thành công!' : 'Thêm mới thành công!', { id: toastId });
            fetchData();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Đã có lỗi xảy ra.', { id: toastId });
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Hàm chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu, chữ hoa/thường
    const normalizeText = (str) => {
        if (!str) return '';
        return str
            .toLowerCase() // Chuyển về chữ thường
            .normalize("NFD") // Tách dấu ra khỏi chữ
            .replace(/[\u0300-\u036f]/g, "") // Bỏ các dấu thanh
            .replace(/đ/g, "d"); // Chuyển 'đ' thành 'd'
    };

    const filteredSubjects = subjects.filter(subject => {
        const { school, credits, searchTerm } = filters;
        const normalizedSearchTerm = normalizeText(searchTerm);

        const schoolMatch = !school || subject.schools.some(s => s._id === school);
        const creditsMatch = !credits || subject.credits.toString() === credits;
        const searchMatch = !normalizedSearchTerm ||
            normalizeText(subject.subjectName).includes(normalizedSearchTerm) ||
            normalizeText(subject.subjectCode).includes(normalizedSearchTerm);

        return schoolMatch && creditsMatch && searchMatch;
    });

    // --- LOGIC MỚI: Xử lý chọn và xóa hàng loạt ---
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const handleSelectSubject = (id) => {
        setSelectedSubjects(prev => prev.includes(id) ? prev.filter(subjectId => subjectId !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedSubjects(e.target.checked ? filteredSubjects.map(s => s._id) : []);
    };

    const handleDeleteSelected = () => {
        const count = selectedSubjects.length;
        if (count === 0) return;
        setConfirmAction(() => (password) => executeDeleteSelected(password));
        setIsConfirmModalOpen(true);
    };

    const executeDeleteSelected = async (password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete('/api/subjects', {
                ...getAuthHeaders(),
                data: { subjectIds: selectedSubjects, password }
            });
            toast.success('Xóa thành công!', { id: toastId });
            setSelectedSubjects([]);
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'Xóa thất bại.';
            toast.error(errorMsg, { id: toastId });
            // Tự động reload lại trang nếu lỗi do sai mật khẩu
            if (errorMsg.includes('Mật khẩu không chính xác')) {
                setIsConfirmModalOpen(false);
                setTimeout(() => window.location.reload(), 1500);
            }
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    // --- LOGIC CHO CHỨC NĂNG IMPORT ---
    const openImportModal = () => {
        setIsImportModalOpen(true);
        setImportFile(null);
        setImportResults(null);
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportResults(null);
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

        const toastId = toast.loading('Đang nhập môn học...');
        try {
            const res = await axios.post('/api/subjects/import', formData, {
                headers: {
                    ...getAuthHeaders().headers,
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success(res.data.msg, { id: toastId });
            setImportResults(res.data);
            fetchData(); // Refresh subject list
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Lỗi khi nhập môn học.', { id: toastId });
            setImportResults(error.response?.data || { failedCount: 1, errors: [{ msg: error.response?.data?.msg || 'Lỗi không xác định.' }] });
        }
    };
    const isAllSelected = filteredSubjects.length > 0 && selectedSubjects.length === filteredSubjects.length;
    // --- KẾT THÚC LOGIC MỚI ---

    const handleDelete = (id) => {
        setConfirmAction(() => (password) => executeDelete(id, password));
        setIsConfirmModalOpen(true);
    };

    const executeDelete = async (id, password) => {
        setIsConfirming(true);
        const toastId = toast.loading('Đang xóa...');
        try {
            await axios.delete(`/api/subjects/${id}`, { ...getAuthHeaders(), data: { password } });
            toast.success('Xóa thành công!', { id: toastId });
            closeModal();
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.msg || 'Xóa thất bại.';
            toast.error(errorMsg, { id: toastId });
            // Tự động reload lại trang nếu lỗi do sai mật khẩu
            if (errorMsg.includes('Mật khẩu không chính xác')) {
                setIsConfirmModalOpen(false);
                setTimeout(() => window.location.reload(), 1500);
            }
        } finally {
            setIsConfirming(false);
            setIsConfirmModalOpen(false);
        }
    };

    // Lấy danh sách số tín chỉ duy nhất từ các môn học đã có để hiển thị trong bộ lọc
    const uniqueCredits = [...new Set(subjects.map(s => s.credits))].sort((a, b) => a - b);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Môn học</h1>
                    <p className="mt-1 text-sm text-gray-600">Thêm, sửa, và quản lý các môn học trong chương trình đào tạo.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="searchTerm" className="form-label">Tìm kiếm</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input type="text" id="searchTerm" name="searchTerm" placeholder="Tên hoặc mã môn..." value={filters.searchTerm} onChange={handleFilterChange} className="input-field pl-10" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="school-filter" className="form-label">Lọc theo trường</label>
                        <select id="school-filter" name="school" value={filters.school} onChange={handleFilterChange} className="input-field">
                            <option value="">Tất cả các trường</option>
                            {allSchools.map(school => (
                                <option key={school._id} value={school._id}>{school.schoolName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="credits-filter" className="form-label">Lọc theo tín chỉ</label>
                        <select id="credits-filter" name="credits" value={filters.credits} onChange={handleFilterChange} className="input-field">
                            <option value="">Tất cả tín chỉ</option>
                            {uniqueCredits.map(c => (
                                <option key={c} value={c}>{c} tín chỉ</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 mb-4">
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {selectedSubjects.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                        >
                            <Trash2 className="h-5 w-5" />
                            Xóa ({selectedSubjects.length})
                        </button>
                    )}
                    <button
                        onClick={openImportModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                    >
                        <Upload className="h-5 w-5" />
                        Nhập từ Excel/CSV
                    </button>
                    <button 
                        onClick={() => openModal()} 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    >
                        <BookOpen className="h-5 w-5" />
                        Thêm Môn học
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Mã Môn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Tên Môn học</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Số TC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Các trường</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-red-800 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSubjects.map((subject) => (
                                <tr key={subject._id} onDoubleClick={() => openModal(subject)} className={`hover:bg-gray-50 cursor-pointer ${selectedSubjects.includes(subject._id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" checked={selectedSubjects.includes(subject._id)} onChange={() => handleSelectSubject(subject._id)} onClick={(e) => e.stopPropagation()} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.subjectCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{subject.subjectName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{subject.credits}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {subject.schools.map(s => s.schoolCode).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={(e) => { e.stopPropagation(); openModal(subject); }} className="text-indigo-600 hover:text-indigo-900">
                                            <Edit className="h-5 w-5" />
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
                    <div className="relative top-10 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-xl bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            {currentSubject ? 'Chỉnh sửa Môn học' : 'Thêm Môn học mới'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mã Môn học</label>
                                    <input type="text" name="subjectCode" value={formData.subjectCode} onChange={handleInputChange} className="mt-1 input-field" required disabled={!!currentSubject} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Số tín chỉ</label>
                                    <input type="number" name="credits" value={formData.credits} onChange={handleInputChange} className="mt-1 input-field" min="1" max="10" required />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Tên Môn học</label>
                                <input type="text" name="subjectName" value={formData.subjectName} onChange={handleInputChange} className="mt-1 input-field" required />
                            </div>
                            <div className="mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại môn</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="mt-1 input-field w-full" required>
                                        <option value="required">Bắt buộc</option>
                                        <option value="elective">Tự chọn</option>
                                        <option value="general">Đại cương</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Áp dụng cho các trường</label>
                                <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto p-2">
                                    <div className="flex items-center mb-2 border-b pb-2">
                                        <input id="select-all" type="checkbox" onChange={handleSelectAllSchools} checked={formData.schools.length === allSchools.length} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                        <label htmlFor="select-all" className="ml-3 block text-sm font-bold text-gray-900">Chọn tất cả</label>
                                    </div>
                                    {allSchools.map(school => (
                                        <div key={school._id} className="flex items-center py-1">
                                            <input id={`school-${school._id}`} name="schools" type="checkbox" checked={formData.schools.includes(school._id)} onChange={() => handleSchoolChange(school._id)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                            <label htmlFor={`school-${school._id}`} className="ml-3 block text-sm text-gray-700">{school.schoolName} ({school.schoolCode})</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <div>
                                    {currentSubject && (
                                        <button type="button" onClick={() => handleDelete(currentSubject._id)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                            Xóa môn học
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

            {isImportModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Nhập Môn học từ tệp
                        </h3>
                        <form onSubmit={handleImportSubmit}>
                            <div className="mb-4">
                                <label htmlFor="importFile" className="block text-sm font-medium text-gray-700">Chọn tệp Excel/CSV</label>
                                <input
                                    type="file"
                                    id="importFile"
                                    name="importFile"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={handleImportFileChange}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    required
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Các cột: `subjectCode`, `subjectName`, `credits`, `schools`, `category`. Các mã trường trong cột `schools` phải cách nhau bởi dấu chấm phẩy (;).
                                </p>
                            </div>

                            {importResults && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                                    <p className="text-sm font-medium text-gray-800">Kết quả nhập:</p>
                                    <p className="text-sm text-gray-700">Tổng số dòng đã xử lý: {importResults.processedCount || (importResults.importedCount + importResults.failedCount)}</p>
                                    <p className="text-sm text-green-600">Thêm thành công: {importResults.importedCount}</p>
                                    {importResults.failedCount > 0 && (
                                        <div className="text-sm text-red-600">
                                            Thất bại: {importResults.failedCount}
                                            <ul className="list-disc list-inside mt-2 text-xs">
                                                {importResults.errors.map((err, index) => (
                                                    <li key={index}>Mã môn '{err.row.subjectCode || 'không xác định'}': {err.msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={closeImportModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all">
                                    Đóng
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                                    Tải lên và Nhập
                                </button>
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

export default ManageSubjects;