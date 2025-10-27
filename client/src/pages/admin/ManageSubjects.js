import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

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
    });

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

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
            const toastId = toast.loading('Đang xóa...');
            try {
                await axios.delete(`/api/subjects/${id}`, getAuthHeaders());
                toast.success('Xóa thành công!', { id: toastId });
                closeModal(); // Đóng modal sau khi xóa
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.msg || 'Xóa thất bại.', { id: toastId });
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Môn học</h1>
                <button onClick={() => openModal()} className="btn btn-primary">
                    <Plus className="h-5 w-5 mr-2" />
                    Thêm Môn học
                </button>
            </div>

            {isLoading ? <p>Đang tải...</p> : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Môn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Môn học</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số TC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Các trường</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {subjects.map((subject) => (
                                <tr key={subject._id} onClick={() => openModal(subject)} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.subjectCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{subject.subjectName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{subject.credits}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {subject.schools.map(s => s.schoolCode).join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
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
                                        <button type="button" onClick={() => handleDelete(currentSubject._id)} className="btn btn-danger">
                                            Xóa môn học
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-3">
                                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary">
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

export default ManageSubjects;