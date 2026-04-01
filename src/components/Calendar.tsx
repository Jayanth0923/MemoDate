import React, { useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, isFuture, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  memoryDates?: string[];
}

export function Calendar({ selectedDate, onDateSelect, memoryDates = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDate));
  const [direction, setDirection] = React.useState(0);

  // Sync currentMonth with selectedDate when it changes externally
  useEffect(() => {
    setCurrentMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const nextMonth = () => {
    setDirection(1);
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  const prevMonth = () => {
    setDirection(-1);
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  const goToToday = () => {
    const today = new Date();
    setDirection(today > currentMonth ? 1 : -1);
    setCurrentMonth(startOfMonth(today));
    onDateSelect(today);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = startOfDay(new Date());
  const isViewingCurrentMonth = isSameMonth(currentMonth, today);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0
    })
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6 transition-colors duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-display font-black text-gray-900 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <AnimatePresence>
            {!isViewingCurrentMonth && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                onClick={goToToday}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Present Date
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={nextMonth}
            disabled={isViewingCurrentMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1 sm:mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentMonth.toISOString()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) {
                prevMonth();
              } else if (info.offset.x < -100 && !isViewingCurrentMonth) {
                nextMonth();
              }
            }}
            className="grid grid-cols-7 gap-0.5 sm:gap-1 cursor-grab active:cursor-grabbing"
          >
            {calendarDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, today);
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasMemory = memoryDates.includes(dateStr);
              const isFutureDate = day > today;

              return (
                <button
                  key={idx}
                  onClick={() => !isFutureDate && onDateSelect(day)}
                  disabled={isFutureDate}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-xl sm:rounded-2xl transition-all relative group",
                    !isCurrentMonth && "text-gray-300 dark:text-gray-600",
                    isCurrentMonth && !isSelected && !isFutureDate && "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                    isSelected && "bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20 scale-105 z-10",
                    isToday && !isSelected && "text-rose-600 dark:text-rose-400 font-bold",
                    hasMemory && !isSelected && "bg-rose-50/50 dark:bg-rose-900/10",
                    isFutureDate && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "text-xs sm:text-base",
                    hasMemory && !isSelected && "text-rose-600 dark:text-rose-400 font-bold"
                  )}>{format(day, 'd')}</span>
                  {isToday && !isSelected && (
                    <div className="absolute bottom-1 sm:bottom-2 w-1 h-1 bg-rose-600 dark:bg-rose-400 rounded-full" />
                  )}
                  {hasMemory && !isSelected && (
                    <div className="absolute top-1 right-1 w-1 h-1 bg-rose-400 dark:bg-rose-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
