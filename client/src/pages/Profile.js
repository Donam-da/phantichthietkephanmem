import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Lock,
  Save,
  Edit,
  Eye,
  EyeOff,
  Camera,
  Book,
  Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [schools, setSchools] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword
  } = useForm();

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        avatar: user.avatar || null,
        school: user.school?._id || ''
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user, reset]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        // Assuming /api/schools is public or user is authenticated
        const response = await api.get('/api/schools');
        setSchools(response.data);
      } catch (error) {
        toast.error('Không thể tải danh sách trường.');
      }
    };
    fetchSchools();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setValue('avatar', reader.result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmitProfile = async (data) => {
    try {
      // Handle school change request separately
      if (user.role === 'student' && data.school && data.school !== user.school?._id) {
        try {
          await api.post('/api/change-requests', {
            requestType: 'change_school',
            requestedValue: data.school
          });
          toast.success('Yêu cầu thay đổi trường đã được gửi đi. Vui lòng chờ quản trị viên phê duyệt.');
        } catch (requestError) {
          toast.error(requestError.response?.data?.message || 'Không thể gửi yêu cầu thay đổi trường.');
        }
        // Do not include school in the main profile update
        delete data.school;
      }

      // Prepare data for submission, removing empty gender field
      const submissionData = { ...data };
      if (submissionData.gender === '') {
        delete submissionData.gender;
      }
      // Only include avatar if it has changed
      if (data.avatar === user.avatar) {
        delete submissionData.avatar;
      }

      const result = await updateProfile(submissionData);
      if (result.success) {
        toast.success('Cập nhật hồ sơ thành công!');
        setIsEditing(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật hồ sơ');
    }
  };

  const onSubmitPassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      const result = await changePassword(data.currentPassword, data.newPassword);
      if (result.success) {
        toast.success('Đổi mật khẩu thành công!');
        setIsChangingPassword(false);
        resetPassword();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đổi mật khẩu');
    }
  };

  const handleCancelEdit = () => {
    reset();
    setAvatarPreview(user.avatar || null);
    setIsEditing(false);
  };

  const handleCancelPassword = () => {
    resetPassword();
    setIsChangingPassword(false);
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'student': return 'Sinh viên';
      case 'teacher': return 'Giảng viên';
      case 'admin': return 'Quản trị viên';
      default: return role;
    }
  };

  const getGenderDisplayName = (gender) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return 'Chưa cập nhật';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="mt-2 text-sm text-gray-700">
          Quản lý thông tin cá nhân và tài khoản của bạn
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Thông tin cá nhân</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img 
                        src={avatarPreview || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`} 
                        alt="Avatar" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                        <Camera className="h-4 w-4" />
                        <input id="avatar-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarChange} />
                      </label>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-800">Ảnh đại diện</h4>
                      <p className="text-sm text-gray-500 mb-2">Tải lên ảnh PNG, JPG hoặc GIF (tối đa 5MB).</p>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="input-field pl-10"
                          placeholder="Hoặc dán URL ảnh vào đây"
                          onBlur={(e) => { if (e.target.value) { setAvatarPreview(e.target.value); setValue('avatar', e.target.value); } }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Họ và tên đệm</label>
                      <input
                        type="text"
                        {...register('firstName', { required: 'Họ và tên đệm là bắt buộc' })}
                        className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Tên</label>
                      <input
                        type="text"
                        {...register('lastName', { required: 'Tên là bắt buộc' })}
                        className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        {...register('email', { 
                          required: 'Email là bắt buộc',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Email không hợp lệ'
                          }
                        })}
                        className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Số điện thoại</label>
                      <input
                        type="tel"
                        {...register('phone')}
                        className="input-field"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>

                    <div>
                      <label className="form-label">Ngày sinh</label>
                      <input
                        type="date"
                        {...register('dateOfBirth')}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="form-label">Giới tính</label>
                      <select {...register('gender')} className="input-field">
                        <option value="">Chọn giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    {user.role === 'student' && (
                      <div>
                        <label className="form-label">Trường</label>
                        <select 
                          {...register('school')} 
                          className="input-field"
                        >
                          <option value="">Chọn trường</option>
                          {schools.map(s => (
                            <option key={s._id} value={s._id}>
                              {s.schoolName}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Việc thay đổi trường cần quản trị viên phê duyệt.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Địa chỉ</label>
                    <textarea
                      {...register('address')}
                      rows={3}
                      className="input-field"
                      placeholder="Nhập địa chỉ của bạn"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Họ và tên đệm</label>
                      <p className="text-gray-900">{user.firstName || 'Chưa cập nhật'}</p>
                    </div>

                    <div>
                      <label className="form-label">Tên</label>
                      <p className="text-gray-900">{user.lastName || 'Chưa cập nhật'}</p>
                    </div>

                    <div>
                      <label className="form-label">Email</label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>

                    <div>
                      <label className="form-label">Số điện thoại</label>
                      <p className="text-gray-900">{user.phone || 'Chưa cập nhật'}</p>
                    </div>

                    <div>
                      <label className="form-label">Ngày sinh</label>
                      <p className="text-gray-900">
                        {user.dateOfBirth 
                          ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN')
                          : 'Chưa cập nhật'
                        }
                      </p>
                    </div>

                    <div>
                      <label className="form-label">Giới tính</label>
                      <p className="text-gray-900">{getGenderDisplayName(user.gender)}</p>
                    </div>
                  </div>
                  {user.role === 'student' && (
                    <div>
                      <label className="form-label">Trường</label>
                      <p className="text-gray-900">{user.school?.schoolName || 'Chưa cập nhật'}</p>
                    </div>
                  )}

                  <div>
                    <label className="form-label">Địa chỉ</label>
                    <p className="text-gray-900">{user.address || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="mt-6 bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Đổi mật khẩu</h3>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Đổi mật khẩu
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {isChangingPassword ? (
                <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
                  <div>
                    <label className="form-label">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...registerPassword('currentPassword', { required: 'Mật khẩu hiện tại là bắt buộc' })}
                        className={`input-field pr-10 ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...registerPassword('newPassword', { 
                          required: 'Mật khẩu mới là bắt buộc',
                          minLength: {
                            value: 6,
                            message: 'Mật khẩu phải có ít nhất 6 ký tự'
                          }
                        })}
                        className={`input-field pr-10 ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerPassword('confirmPassword', { 
                          required: 'Xác nhận mật khẩu là bắt buộc',
                          validate: value => value === watchPassword('newPassword') || 'Mật khẩu xác nhận không khớp'
                        })}
                        className={`input-field pr-10 ${passwordErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelPassword}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Đổi mật khẩu
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-gray-500 text-sm">
                  Để bảo mật tài khoản, hãy thay đổi mật khẩu định kỳ và không chia sẻ với người khác.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center"> 
              <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4">
                <img 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"/>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                {getRoleDisplayName(user.role)}
              </span>
            </div>
          </div>

          {/* Academic Info */}
          {user.role === 'student' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Thông tin học tập</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mã sinh viên:</span>
                  <span className="font-medium text-gray-900">{user.studentId || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Trường:</span>
                  <span className="font-medium text-gray-900">{user.school?.schoolName || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Năm học:</span>
                  <span className="font-medium text-gray-900">{user.year || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Học kỳ:</span>
                  <span className="font-medium text-gray-900">{user.semester || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GPA:</span>
                  <span className="font-medium text-gray-900">{user.gpa?.toFixed(2) || 'Chưa có'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tín chỉ hiện tại:</span>
                  <span className="font-medium text-gray-900">{user.currentCredits || 0}/{user.maxCredits || 24}</span>
                </div>
              </div>
            </div>
          )}

          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Trạng thái tài khoản</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Ngày tạo:</span>
                <span className="text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cập nhật lần cuối:</span>
                <span className="text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 