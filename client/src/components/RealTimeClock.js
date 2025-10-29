import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
      <Clock size={16} className="text-gray-500" />
      <span>
        {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
};

export default RealTimeClock;