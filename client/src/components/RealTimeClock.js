import React, { useState, useEffect } from 'react';

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  // Tính toán góc quay cho các kim (bao gồm cả sự di chuyển mượt mà)
  const secondsAngle = seconds * 6;
  const minutesAngle = minutes * 6 + seconds * 0.1;
  const hoursAngle = (hours % 12) * 30 + minutes * 0.5;

  // Định dạng ngày tháng theo dd/MM/yy
  const day = String(time.getDate()).padStart(2, '0');
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const year = String(time.getFullYear()).slice(-2);
  const dateString = `${day}/${month}/${year}`;

  // Tạo các số từ 1 đến 12
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const angle = (num * 30 - 90) * (Math.PI / 180); // Góc quay cho mỗi số
    const radius = 40; // Bán kính để đặt số
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return (
      <text
        key={num}
        x={x}
        y={y}
        fill="#4b5563" // text-gray-600
        fontSize="10"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {num}
      </text>
    );
  });

  return (
    <div className="flex items-center justify-center w-20 h-20">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Mặt đồng hồ */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#d1d5db" strokeWidth="2" />

        {/* Các số trên mặt đồng hồ */}
        {numbers}

        {/* Khung hiển thị ngày tháng */}
        <rect x="38" y="64" width="24" height="12" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" rx="1" />
        <text
          x="50"
          y="70"
          fill="#2408f2ff"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
        >
          {dateString}
        </text>

        {/* Kim giờ */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="25"
          stroke="#374151"
          strokeWidth="5"
          strokeLinecap="round"
          transform={`rotate(${hoursAngle} 50 50)`}
        />
        {/* Kim phút */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke="#4b5563" // text-gray-600
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${minutesAngle} 50 50)`}
        />
        {/* Kim giây */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="10"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${secondsAngle} 50 50)`}
        />
        {/* Tâm đồng hồ */}
        <circle cx="50" cy="50" r="4" fill="#ef4444" />
      </svg>
    </div>
  );
};

export default RealTimeClock;