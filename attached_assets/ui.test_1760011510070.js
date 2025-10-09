import fs from 'fs';
import path from 'path';

test('index.html contains version marker and critical IDs', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  expect(html).toMatch(/data-profile-version="4\.1"/);
  ['resumeSection','resumeCanvas','prevPageBtn','nextPageBtn','pageIndicator','bookingCard','calGrid','calPrev','calNext','email','confirmBookingBtn']
    .forEach(id => expect(html).toMatch(new RegExp(`id=["']${id}["']`)));
});
