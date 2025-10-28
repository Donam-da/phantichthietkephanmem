import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

const ConfirmPasswordModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (password) {
            onConfirm(password);
        }
    };

    const handleClose = () => {
        setPassword('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ShieldAlert className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4 text-left">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500 mt-2">{message}</p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Vui lòng nhập mật khẩu của bạn để xác nhận</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 input-field"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={handleConfirm} disabled={!password || isLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                        {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                    <button type="button" onClick={handleClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmPasswordModal;

