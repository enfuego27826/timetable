/* Browser implementation of the timetable API for static hosting. */
(() => {
    const data = fetch('data.json').then(response => {
        if (!response.ok) throw new Error('Could not load timetable data');
        return response.json();
    });
    const occupied = course => course.sessions.flatMap(session => session.slots);

    function timetable(source, selected) {
        const result = {};
        for (const row of source.slots) {
            for (const [day, slot] of Object.entries(row)) {
                if (day === 'Time Slot' || !slot) continue;
                const entries = source.courses.filter(course => selected.includes(course.code))
                    .flatMap(course => course.sessions.filter(session => session.slots.includes(slot))
                        .map(session => ({course, session})));
                if (!entries.length) continue;
                const text = entries.length > 1
                    ? entries.map(entry => entry.course.code).join('/ ') + ', (Clash)'
                    : [entries[0].course.code, entries[0].course.name.replaceAll(',', ' '),
                        entries[0].session.type, entries[0].session.location.replaceAll(',', ' ')].filter(Boolean).join(', ');
                (result[day.toLowerCase()] ||= []).push({time: row['Time Slot'], class: text});
            }
        }
        return result;
    }

    const escapeICS = text => String(text).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
    function calendar(source, selected) {
        const start = window.prompt('Enter your semester start date (YYYY-MM-DD) for calendar events:');
        if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Enter a semester start date');
        const semester = new Date(start + 'T00:00:00Z');
        if (!Number.isFinite(semester.getTime()) || semester.toISOString().slice(0, 10) !== start) throw new Error('Invalid start date');
        const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IIT Gandhinagar//Timetable//EN'];
        const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        for (const row of source.slots) {
            const times = row['Time Slot'].split('-').map(time => time.trim().split(':').map(Number));
            for (const [index, day] of days.entries()) {
                const date = new Date(semester);
                date.setUTCDate(date.getUTCDate() + ((index + 1 - date.getUTCDay() + 7) % 7));
                const dateString = date.toISOString().slice(0, 10).replaceAll('-', '');
                const datetime = time => dateString + 'T' + time.map(n => String(n).padStart(2, '0')).join('') + '00';
                for (const course of source.courses.filter(course => selected.includes(course.code))) {
                    for (const session of course.sessions.filter(session => session.slots.includes(row[day]))) {
                        lines.push('BEGIN:VEVENT', 'UID:' + crypto.randomUUID() + '@iitgn.ac.in',
                            'DTSTAMP:' + stamp, 'DTSTART;TZID=Asia/Kolkata:' + datetime(times[0]),
                            'DTEND;TZID=Asia/Kolkata:' + datetime(times[1]), 'RRULE:FREQ=WEEKLY;COUNT=16',
                            'SUMMARY:' + escapeICS(course.code + ' ' + course.name + ' (' + session.type + ')'),
                            'LOCATION:' + escapeICS(session.location || 'IIT Gandhinagar'), 'END:VEVENT');
                    }
                }
            }
        }
        lines.push('END:VCALENDAR');
        // Fold at 75 UTF-8 octets, as required by iCalendar.
        const encoder = new TextEncoder();
        return lines.map(line => {
            let folded = '', length = 0;
            for (const char of line) {
                const size = encoder.encode(char).length;
                if (length + size > 75) { folded += '\r\n '; length = 1; }
                folded += char;
                length += size;
            }
            return folded;
        }).join('\r\n') + '\r\n';
    }

    window.staticTimetableRequest = async (url, options = {}) => {
        const source = await data;
        const selected = JSON.parse(options.body || '{}').courses || [];
        let result;
        switch (url) {
            case '/api/courses':
                result = {courses: source.courses, days: Object.keys(source.slots[0]), timeLabels: source.slots.map(row => row['Time Slot'])};
                break;
            case '/api/timetable':
                result = timetable(source, selected);
                break;
            case '/api/available-courses': {
                const used = new Set(source.courses.filter(course => selected.includes(course.code)).flatMap(occupied));
                result = {success: true, courses: source.courses.filter(course => !selected.includes(course.code)
                    && occupied(course).length && occupied(course).every(slot => !used.has(slot)))};
                break;
            }
            case '/api/download-ics':
                return new Response(calendar(source, selected), {headers: {'Content-Type': 'text/calendar'}});
            default:
                throw new Error('Unknown timetable request');
        }
        return new Response(JSON.stringify(result), {headers: {'Content-Type': 'application/json'}});
    };
})();
