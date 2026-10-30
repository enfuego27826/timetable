const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = JSON.parse(fs.readFileSync('dist/data.json', 'utf8'));
const context = {
    window: {prompt: () => '2027-01-04'},
    fetch: async () => new Response(JSON.stringify(source)),
    Response, TextEncoder, crypto: require('node:crypto').webcrypto,
};
vm.runInNewContext(fs.readFileSync('static/js/pages-api.js', 'utf8'), context);
async function request(path, courses = []) {
    return context.window.staticTimetableRequest('/api/' + path, {body: JSON.stringify({courses})});
}
test('Semester II courses load and MA 104 (E) maps to E1, E2 and H2', async () => {
    const data = await (await request('courses')).json();
    assert.equal(data.courses.length, 276);
    assert(data.courses.some(course => course.code === 'MA 104 (E)'));
    const timetable = await (await request('timetable', ['MA 104 (E)'])).json();
    assert.deepEqual(Object.keys(timetable).sort(), ['friday', 'wednesday']);
    assert.equal(timetable.wednesday.length, 2);
    assert.equal(timetable.friday.length, 1);
    assert(timetable.wednesday[0].class.includes('Jasubhai Auditorium'));
});
test('clashes are displayed and excluded from suggestions', async () => {
    const timetable = await (await request('timetable', ['MA 104 (E)', 'MA 104 (H)'])).json();
    assert(timetable.wednesday[0].class.includes('(Clash)'));
    const suggestions = await (await request('available-courses', ['MA 104 (E)'])).json();
    assert(suggestions.courses.length > 0);
    assert(!suggestions.courses.some(course => ['MA 104 (E)', 'MA 104 (H)'].includes(course.code)));
    for (const course of suggestions.courses) {
        assert(course.sessions.every(session => session.slots.every(slot => !['E1', 'E2', 'H2'].includes(slot))));
    }
});
test('calendar export uses the chosen start date and India timezone', async () => {
    const response = await request('download-ics', ['MA 104 (E)']);
    const calendar = await response.text();
    assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 3);
    assert(calendar.includes('DTSTART;TZID=Asia/Kolkata:20270106T100000'));
    assert(calendar.includes('DTSTART;TZID=Asia/Kolkata:20270108T100000'));
    assert(calendar.includes('RRULE:FREQ=WEEKLY;COUNT=16'));
    assert(calendar.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
});
test('static HTML uses relative paths for project Pages', () => {
    const html = fs.readFileSync('dist/index.html', 'utf8');
    assert(!html.includes('{{'));
    assert(!html.includes('="/static/'));
    assert(html.includes('static/js/pages-api.js'));
    assert(html.includes('href="source-timetable.csv"'));
});
