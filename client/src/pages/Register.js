import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  GraduationCap,
  Calendar,
  Hash,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await api.get('/api/schools');
        setSchools(response.data);
      } catch (error) {
        toast.error('Không thể tải danh sách trường.');
      }
    };
    fetchSchools();
  }, []);

  const watchPassword = watch('password');

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    const submissionData = { ...data, role: 'student' };
    setIsLoading(true);
    try {
      const result = await registerUser(submissionData);
      if (result.success) {
        toast.success('Đăng ký tài khoản thành công!');
        navigate('/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đăng ký');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back Button */}
        <div className="text-left">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại đăng nhập
          </Link>
        </div>

        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">T</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký tài khoản mới
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              đăng nhập nếu đã có tài khoản
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Student ID (for students) */}
            <div>
                <label className="form-label">Mã sinh viên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    maxLength="8"
                    pattern="\d{8}"
                    {...register('studentId', { 
                      required: 'Mã sinh viên là bắt buộc',
                      pattern: {
                        value: /^\d{8}$/,
                        message: 'Mã sinh viên phải là 8 chữ số.'
                      }
                    })}
                    className={`input-field pl-10 ${errors.studentId ? 'border-red-500' : ''}`}
                    placeholder="Nhập mã sinh viên"
                  />
                </div>
                {errors.studentId && (
                  <p className="mt-1 text-sm text-red-600">{errors.studentId.message}</p>
                )}
              </div>

            {/* Full Name Field */}
            <div>
              <label className="form-label">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  {...register('fullName', { required: 'Họ và tên là bắt buộc' })}
                  className={`input-field pl-10 ${errors.fullName ? 'border-red-500' : ''}`}
                  placeholder="Nhập họ và tên đầy đủ"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="form-label">Địa chỉ email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email là bắt buộc',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email không hợp lệ'
                    }
                  })}
                  className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="Nhập email của bạn"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Student-specific fields */}
            <>
              <div>
                <label className="form-label">Trường</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GraduationCap className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    {...register('school', { required: 'Vui lòng chọn trường' })}
                    className={`input-field pl-10 ${errors.school ? 'border-red-500' : ''}`}
                  >
                    <option value="">Chọn trường</option>
                    {schools.map(school => (
                      <option key={school._id} value={school._id}>{school.schoolName}</option>
                    ))}
                  </select>
                </div>
                {errors.school && (
                  <p className="mt-1 text-sm text-red-600">{errors.school.message}</p>
                )}
              </div>
            </>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { 
                      required: 'Mật khẩu là bắt buộc',
                      minLength: {
                        value: 6,
                        message: 'Mật khẩu phải có ít nhất 6 ký tự'
                      }
                    })}
                    className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Nhập mật khẩu"
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
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Xác nhận mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword', { 
                      required: 'Xác nhận mật khẩu là bắt buộc',
                      validate: value => value === watchPassword || 'Mật khẩu xác nhận không khớp'
                    })}
                    className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Nhập lại mật khẩu"
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
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              {...register('terms', { 
                required: 'Bạn phải đồng ý với điều khoản sử dụng' 
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              Tôi đồng ý với{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                điều khoản sử dụng
              </a>{' '}
              và{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                chính sách bảo mật
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                `Đăng ký tài khoản sinh viên`
              )}
            </button>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Bằng việc đăng ký, bạn xác nhận rằng thông tin cung cấp là chính xác và đầy đủ.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 