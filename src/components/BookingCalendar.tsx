import React, { useMemo, useState } from 'react';
import type { BookingRecord, BookingStatus } from '../types';

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

const CHIP: Record<string, string> = {
  new: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  done: 'bg-neutral-700/40 text-gray-300 border-neutral-600',
  no_show: 'bg-neutral-700/40 text-gray-400 border-neutral-600'
};

const STATUS_TEXT: Record<BookingStatus, string> = {
  new: 'Чака решение',
  confirmed: 'Потвърдена',
  done: 'Изпълнена',
  no_show: 'Неявяване',
  cancelled: 'Отказана'
};

const pad = (n: number) => String(n).padStart(2, '0');
// Dates are salon-local "YYYY-MM-DD" strings; they are compared as text, never converted.
const todayStr = () => new Date().toLocaleDateString('sv-SE');

export interface BookingHandlers {
  onAccept: (b: BookingRecord) => void;
  onDecline: (b: BookingRecord) => void;
  onStatus: (b: BookingRecord, status: BookingStatus) => void;
  onResend: (b: BookingRecord) => void;
  emailEnabled: boolean;
}

/** What happened with the confirmation email of an accepted booking (null = nothing to say yet). */
function emailState(b: BookingRecord, emailEnabled: boolean) {
  if (b.status !== 'confirmed' && !b.emailSentAt) return null;
  if (b.emailSentAt) {
    const when = new Date(b.emailSentAt).toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' });
    return { tone: 'ok', text: `Имейл за потвърждение изпратен на ${when}`, canResend: false };
  }
  if (!b.email) return { tone: 'warn', text: 'Няма имейл адрес – потвърдете по телефона.', canResend: false };
  if (b.emailError) return { tone: 'bad', text: `Имейлът не е изпратен: ${b.emailError}`, canResend: emailEnabled };
  if (!emailEnabled) {
    return { tone: 'warn', text: 'Имейлите са изключени (липсват SMTP настройки в .env).', canResend: false };
  }
  return { tone: 'warn', text: 'Имейлът още не е изпратен.', canResend: true };
}

const TONE: Record<string, string> = {
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
  bad: 'text-rose-300'
};

/** Accept / Decline for a request, follow-up buttons for an accepted booking, plus the email status line. */
export const BookingActions: React.FC<{ booking: BookingRecord; handlers: BookingHandlers }> = ({
  booking,
  handlers
}) => {
  const email = emailState(booking, handlers.emailEnabled);
  const small = 'px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition';
  return (
    <div className="space-y-2">
      {booking.status === 'new' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlers.onAccept(booking)}
            className={`${small} bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500`}
          >
            <i className="fa-solid fa-check mr-1.5"></i>Приеми
          </button>
          <button
            type="button"
            onClick={() => handlers.onDecline(booking)}
            className={`${small} bg-rose-950/40 hover:bg-rose-900 text-rose-200 border-rose-800/60`}
          >
            <i className="fa-solid fa-xmark mr-1.5"></i>Откажи
          </button>
        </div>
      )}
      {booking.status === 'confirmed' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlers.onStatus(booking, 'done')}
            className={`${small} bg-neutral-800 hover:bg-neutral-700 text-gray-200 border-neutral-600`}
          >
            Изпълнена
          </button>
          <button
            type="button"
            onClick={() => handlers.onStatus(booking, 'no_show')}
            className={`${small} bg-neutral-800 hover:bg-neutral-700 text-gray-200 border-neutral-600`}
          >
            Неявяване
          </button>
          <button
            type="button"
            onClick={() => handlers.onDecline(booking)}
            className={`${small} bg-rose-950/40 hover:bg-rose-900 text-rose-200 border-rose-800/60`}
          >
            Отмени
          </button>
        </div>
      )}
      {email && (
        <div className={`text-[11px] flex flex-wrap items-center gap-2 ${TONE[email.tone]}`}>
          <i className="fa-regular fa-paper-plane"></i>
          <span>{email.text}</span>
          {email.canResend && (
            <button
              type="button"
              onClick={() => handlers.onResend(booking)}
              className="px-2 py-0.5 rounded border border-current hover:bg-white/10 cursor-pointer"
            >
              Изпрати отново
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface BookingCalendarProps extends BookingHandlers {
  bookings: BookingRecord[];
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ bookings, ...handlers }) => {
  const today = todayStr();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1); // 0-based
  const [selected, setSelected] = useState<string | null>(today);

  // Declined / cancelled requests stay in the list view but never clutter the calendar.
  const byDate = useMemo(() => {
    const map = new Map<string, BookingRecord[]>();
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      map.set(b.date, [...(map.get(b.date) || []), b]);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [bookings]);

  // Two accepted bookings with the same named stylist at the same date and time.
  // "First available stylist" is excluded: it is assigned to someone later.
  const clashes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const b of bookings) {
      if (b.status !== 'confirmed' || b.stylistId === 'any') continue;
      const key = `${b.date}|${b.time}|${b.stylistId}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  }, [bookings]);
  const clashKey = (b: BookingRecord) => `${b.date}|${b.time}|${b.stylistId}`;

  const pendingTotal = bookings.filter((b) => b.status === 'new').length;

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
    setSelected(null);
  };
  const goToday = () => {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
    setSelected(today);
  };

  const leading = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)
  ];

  const dayList = selected ? byDate.get(selected) || [] : [];

  return (
    <div className="space-y-4">
      <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Предишен месец"
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <h3 className="font-cinzel text-lg font-bold text-white min-w-[11rem] text-center">
              {MONTHS[month]} {year}
            </h3>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Следващ месец"
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 cursor-pointer"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 text-xs cursor-pointer"
            >
              Днес
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Чака решение
              {pendingTotal > 0 && <strong className="text-amber-300">({pendingTotal})</strong>}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Потвърдена
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-gray-400 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => {
            if (!date) return <div key={`blank-${index}`} className="min-h-[4.5rem]" />;
            const list = byDate.get(date) || [];
            const hasPending = list.some((b) => b.status === 'new');
            const hasClash = list.some((b) => clashes.has(clashKey(b)));
            const isToday = date === today;
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-label={`${date}: ${list.length} резервации`}
                className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left align-top transition cursor-pointer ${
                  isSelected
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : hasPending
                      ? 'border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10'
                      : 'border-neutral-800 bg-[#171717] hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold ${
                      isToday ? 'text-black bg-[#E6CA65] rounded px-1' : 'text-gray-300'
                    }`}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {hasClash && <i className="fa-solid fa-triangle-exclamation text-[10px] text-rose-400"></i>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className={`truncate text-[10px] leading-4 border rounded px-1 ${CHIP[b.status] || CHIP.done}`}
                    >
                      {b.time} {b.name}
                    </div>
                  ))}
                  {list.length > 2 && <div className="text-[10px] text-gray-400">+{list.length - 2} още</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 sm:p-5">
        {!selected ? (
          <p className="text-sm text-gray-400">Изберете ден от календара, за да видите резервациите.</p>
        ) : (
          <>
            <h4 className="font-cinzel text-base font-bold text-white mb-3">{selected}</h4>
            {dayList.length === 0 ? (
              <p className="text-sm text-gray-400">Няма резервации за този ден.</p>
            ) : (
              <div className="space-y-3">
                {dayList.map((b) => (
                  <div key={b.id} className="bg-[#171717] border border-neutral-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono font-bold text-[#E6CA65] text-sm">{b.time} ч.</span>
                      <span className="font-mono text-gray-400">{b.id}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${CHIP[b.status] || CHIP.done}`}>
                        {STATUS_TEXT[b.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm text-white font-semibold">{b.service}</div>
                    <div className="text-xs text-gray-300">Стилист: {b.stylistName}</div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      <span className="text-white">{b.name}</span> ·{' '}
                      <i className="fa-solid fa-phone text-[#E6CA65] mx-1"></i>
                      <a href={`tel:${b.phone}`} className="text-white underline">
                        {b.phone}
                      </a>
                      {b.email && <span className="text-gray-400"> · {b.email}</span>}
                    </div>
                    {b.notes && <div className="text-xs text-gray-400 italic mt-0.5">„{b.notes}“</div>}
                    {clashes.has(clashKey(b)) && (
                      <div className="mt-1.5 text-[11px] text-rose-300">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        Този стилист има друга потвърдена резервация по същото време.
                      </div>
                    )}
                    <div className="mt-3">
                      <BookingActions booking={b} handlers={handlers} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
