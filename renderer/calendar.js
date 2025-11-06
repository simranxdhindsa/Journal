let calendarInstance = null;

function initCalendar(onDatePicked) {
	const el = document.getElementById('calendar');
	if (!el) return;
	calendarInstance = flatpickr(el, {
		inline: true,
		dateFormat: 'Y-m-d',
		defaultDate: new Date(),
		locale: {
			firstDayOfWeek: 1, // Monday start
		},
		onChange: (selectedDates) => {
			if (selectedDates && selectedDates[0]) {
				const d = selectedDates[0];
				// Use local date to avoid timezone offset issues
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				const iso = `${y}-${m}-${day}`;
				onDatePicked && onDatePicked(iso);
			}
		},
		onReady: async () => {
			await markExistingDates();
		}
	});
}

function setCalendarDate(isoDate) {
	if (!calendarInstance) return;
	const [y, m, d] = isoDate.split('-').map(Number);
	calendarInstance.setDate(new Date(y, m - 1, d), false);
}

async function markExistingDates() {
	const dates = await window.journal.listDates();
	const className = 'has-entry';
	// Clear previous marks
	document.querySelectorAll('.' + className).forEach(n => n.classList.remove(className));
	// Mark only current data entries
	const set = new Set(dates);
	document.querySelectorAll('.flatpickr-day').forEach(node => {
		const d = node.dateObj;
		if (!d) return;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const iso = `${y}-${m}-${day}`;
		if (set.has(iso)) node.classList.add(className);
	});
}

function refreshCalendar() { markExistingDates(); }

window.initCalendar = initCalendar;
window.refreshCalendar = refreshCalendar;
window.setCalendarDate = setCalendarDate;


