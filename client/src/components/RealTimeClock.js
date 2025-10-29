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

  // Định dạng phút
  const formattedMinutes = String(minutes).padStart(2, '0');
  
  // Định dạng giờ (1-24)
  const formattedHours = String(hours).padStart(2, '0');

  // Định dạng giây
  const formattedSeconds = String(seconds).padStart(2, '0');

  // Tính toán góc quay cho các kim (bao gồm cả sự di chuyển mượt mà)
  const secondsAngle = seconds * 6;
  const minutesAngle = minutes * 6 + seconds * 0.1;
  const hoursAngle = (hours % 12) * 30 + minutes * 0.5;

  // Định dạng ngày tháng theo dd/MM
  const day = String(time.getDate()).padStart(2, '0');
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const dateString = `${day}/${month}`;

  // Tạo các vạch chia phút và giờ
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isHourMark = i % 5 === 0;
    const r1 = isHourMark ? 42 : 45;
    const r2 = 48;

    const x1 = 50 + r1 * Math.cos(angle);
    const y1 = 50 + r1 * Math.sin(angle);
    const x2 = 50 + r2 * Math.cos(angle);
    const y2 = 50 + r2 * Math.sin(angle);

    return (
      <line
        key={`tick-${i}`}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke={isHourMark ? "#374151" : "#9ca3af"} // đậm hơn cho vạch giờ
        strokeWidth={isHourMark ? "1.5" : "1"}
      />
    );
  });

  return (
    <div className="flex items-center justify-center w-20 h-20">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Mặt đồng hồ */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#d1d5db" strokeWidth="2" />

        {/* Các số trên mặt đồng hồ */}
        {ticks}

        {/* Khung hiển thị ngày tháng (phía trên, 12 giờ) */}
        <rect x="38" y="20" width="24" height="12" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" rx="1" />
        <text
          x="50"
          y="26"
          fill="#2408f2ff"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {dateString}
        </text>

        {/* Khung hiển thị giờ (bên trái, 9 giờ) */}
        <rect x="15" y="44" width="20" height="12" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" rx="1" />
        <text
          x="25"
          y="50"
          fill="#374151"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formattedHours}
        </text>

        {/* Khung hiển thị phút (bên phải, 3 giờ) */}
        <rect x="65" y="44" width="20" height="12" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" rx="1" />
        <text
          x="75"
          y="50"
          fill="#374151" // Darker color for minutes
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formattedMinutes}
        </text>

        {/* Khung hiển thị giây (phía dưới, 6 giờ) */}
        <rect x="40" y="68" width="20" height="12" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" rx="1" />
        <text
          x="50"
          y="74"
          fill="#ef4444" // Màu đỏ giống kim giây
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formattedSeconds}
        </text>


        {/* Kim giờ */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="25"
          stroke="#374151"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${hoursAngle} 50 50)`}
        />
        {/* Kim phút */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke="#374151"
          strokeWidth="1.5"
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