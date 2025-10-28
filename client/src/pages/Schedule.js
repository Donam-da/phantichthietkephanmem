import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Clock, MapPin, User, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const Schedule = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
    const [displayDays, setDisplayDays] = useState([]);
    // State mới cho lịch nhỏ
    const [calendarDate, setCalendarDate] = useState(new Date());

    const days = [
        { id: 2, name: 'Thứ 2' },
        { id: 3, name: 'Thứ 3' },
        { id: 4, name: 'Thứ 4' },
        { id: 5, name: 'Thứ 5' },
        { id: 6, name: 'Thứ 6' },
        { id: 7, name: 'Thứ 7' },
    ];

    const periods = [
        { id: 1, time: 'Ca 1 (6h45-9h25)' },
        { id: 2, time: 'Ca 2 (9h40-12h10)' },
        { id: 3, time: 'Ca 3 (13h-15h30)' },
        { id: 4, time: 'Ca 4 (15h45-18h25)' },
    ];

    // Hàm để lấy ngày bắt đầu của tuần (Thứ 2)
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // điều chỉnh khi là Chủ nhật
        return new Date(d.setDate(diff));
    };

    useEffect(() => {
        if (!currentSemester) return; // Đợi có thông tin học kỳ
        const startOfWeek = getStartOfWeek(currentWeekStart);
        const weekDays = []; // Giữ lại dòng này
        for (let i = 0; i < 6; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push({
                id: i + 2, // 2 for Monday, 3 for Tuesday, etc.
                name: `Thứ ${i + 2}`,
                dateString: day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                dateObject: day,
            });
        }
        setDisplayDays(weekDays);
    }, [currentWeekStart, currentSemester]);

    const changeWeek = (offset) => {
        setCurrentWeekStart(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };

    const fetchScheduleData = useCallback(async () => {
        try {
            setLoading(true);
            const [registrationsRes, semesterRes] = await Promise.all([
                api.get('/api/registrations?status=approved'),
                api.get('/api/semesters/current')
            ]);

            const approvedRegistrations = registrationsRes.data.registrations;
            const semester = semesterRes.data;
            setCurrentSemester(semester);

            // --- LOGIC MỚI: Tìm tuần học đầu tiên có lịch ---
            let firstClassDate = null;
            if (semester && semester.startDate && approvedRegistrations.length > 0) {
                const semesterStartDate = new Date(semester.startDate);

                for (const reg of approvedRegistrations) {
                    if (reg.course && reg.course.schedule) {
                        for (const slot of reg.course.schedule) {
                            // Tìm ngày đầu tiên của `dayOfWeek` trong học kỳ
                            let currentDate = new Date(semesterStartDate);
                            const jsDayOfWeek = slot.dayOfWeek === 8 ? 0 : slot.dayOfWeek - 1; // Chuyển đổi format

                            while (currentDate.getDay() !== jsDayOfWeek) {
                                currentDate.setDate(currentDate.getDate() + 1);
                            }

                            if (!firstClassDate || currentDate < firstClassDate) {
                                firstClassDate = currentDate;
                            }
                        }
                    }
                }
            }

            // Thiết lập tuần hiển thị mặc định
            let initialDateToShow = new Date(); // Mặc định là tuần hiện tại
            if (firstClassDate) {
                initialDateToShow = firstClassDate;
            } else if (semester && semester.startDate) {
                initialDateToShow = new Date(semester.startDate); // Fallback về tuần đầu học kỳ
            }

            // Đồng bộ cả bảng TKB và lịch nhỏ
            setCurrentWeekStart(initialDateToShow);
            setCalendarDate(initialDateToShow);

            const newSchedule = {};

            approvedRegistrations.forEach(reg => {
                if (reg.course && reg.course.schedule && reg.semester?._id === semester?._id) {
                    reg.course.schedule.forEach(slot => {
                        const key = `${slot.dayOfWeek}-${slot.period}`;
                        if (!newSchedule[key]) {
                            newSchedule[key] = [];
                        }
                        newSchedule[key].push({
                            subjectName: reg.course.subject?.subjectName,
                            classCode: reg.course.classCode,
                            teacher: `${reg.course.teacher?.firstName} ${reg.course.teacher?.lastName}`,
                            classroom: slot.classroom?.roomCode,
                        });
                    });
                }
            });

            setSchedule(newSchedule);
        } catch (error) {
            toast.error('Không thể tải thời khóa biểu.');
            console.error('Error fetching schedule data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const renderCalendar = () => {
        const month = calendarDate.getMonth();
        const year = calendarDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const blanks = [];
        // Sunday is 0, Monday is 1, etc. We want Monday to be the first day.
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        for (let i = 0; i < startDay; i++) {
            blanks.push(<td key={`blank-${i}`} className="p-1"></td>);
        }

        const daysInMonthArr = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = new Date(year, month, d);
            const isToday = dayDate.toDateString() === new Date().toDateString();
            const startOfWeekForDay = getStartOfWeek(dayDate);
            const isSelectedWeek = startOfWeekForDay.getTime() === getStartOfWeek(currentWeekStart).getTime();

            daysInMonthArr.push(
                <td key={d} className="p-1">
                    <button
                        onClick={() => setCurrentWeekStart(dayDate)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                            ${isSelectedWeek ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}
                            ${isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                    >
                        {d}
                    </button>
                </td>
            );
        }

        const totalSlots = [...blanks, ...daysInMonthArr];
        const rows = [];
        let cells = [];

        totalSlots.forEach((cell, i) => {
            if (i % 7 !== 0) {
                cells.push(cell);
            } else {
                rows.push(cells);
                cells = [];
                cells.push(cell);
            }
            if (i === totalSlots.length - 1) {
                rows.push(cells);
            }
        });

        return rows.map((row, i) => <tr key={i}>{row}</tr>);
    };

    const changeCalendarMonth = (offset) => {
        setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    useEffect(() => {
        fetchScheduleData();
    }, [fetchScheduleData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Schedule Content */}
            <div className="lg:col-span-3 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Lịch học chi tiết của bạn cho học kỳ: <span className="font-semibold">{currentSemester?.name || 'hiện tại'}</span>.
                    </p>
                </div>

                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Ca học</th>
                                    {displayDays.map(day => (
                                        <th key={day.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {day.name} <br/> <span className="font-normal normal-case text-gray-600">({day.dateString})</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {periods.map(period => (
                                    <tr key={period.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                                                {period.time}
                                            </div>
                                        </td>
                                        {displayDays.map(day => {
                                            const key = `${day.id}-${period.id}`;
                                            const slots = schedule[key] || [];

                                            // Kiểm tra xem ngày hiện tại có nằm trong khoảng thời gian của học kỳ không
                                            const isWithinSemester = currentSemester &&
                                                day.dateObject >= new Date(new Date(currentSemester.startDate).setHours(0, 0, 0, 0)) &&
                                                day.dateObject <= new Date(new Date(currentSemester.endDate).setHours(23, 59, 59, 999));

                                            return (
                                                <td key={key} className="px-2 py-2 align-top text-xs">
                                                    {isWithinSemester && slots.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {slots.map((slot, index) => (
                                                                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                                                                    <div className="flex items-center font-bold text-blue-800">
                                                                        <BookOpen size={14} className="mr-1.5" />
                                                                        <span>{slot.subjectName} ({slot.classCode})</span>
                                                                    </div>
                                                                    <div className="flex items-center text-gray-700">
                                                                        <User size={14} className="mr-1.5" />
                                                                        <span>{slot.teacher}</span>
                                                                    </div>
                                                                    <div className="flex items-center text-gray-700">
                                                                        <MapPin size={14} className="mr-1.5" />
                                                                        <span>Phòng: {slot.classroom}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full"></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mini Calendar */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => changeCalendarMonth(-1)} className="p-1.5 rounded-full hover:bg-gray-100">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h4 className="font-semibold text-gray-800">
                            Tháng {calendarDate.getMonth() + 1}, {calendarDate.getFullYear()}
                        </h4>
                        <button onClick={() => changeCalendarMonth(1)} className="p-1.5 rounded-full hover:bg-gray-100">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                    <table className="w-full text-center text-sm">
                        <thead>
                            <tr>
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <th key={d} className="py-2 text-xs text-gray-500 font-medium">{d}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {renderCalendar()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Schedule;