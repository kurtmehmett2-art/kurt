const http = require('http');

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let result = '';
      res.on('data', d => result += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(result) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("TEST 1: Missing args create_lesson_record");
  let res = await request('/api/jarvis/execute', 'POST', { action: 'create_lesson_record', args: { classId: 'class-6A-test' } });
  console.log(res);

  console.log("\nTEST 2: Success create_lesson_record");
  res = await request('/api/jarvis/execute', 'POST', { action: 'create_lesson_record', args: { classId: 'class-6A-test', className: '6/A', topic: 'Testing Write Tools', unitNumber: 5, unitName: 'Write Test' } });
  console.log(res);

  console.log("\nTEST 3: Duplicate protection");
  res = await request('/api/jarvis/execute', 'POST', { action: 'create_lesson_record', args: { classId: 'class-6A-test', className: '6/A', topic: 'Testing Write Tools', unitNumber: 5, unitName: 'Write Test' } });
  console.log(res);

  console.log("\nTEST 4: Add teacher note to latest");
  res = await request('/api/jarvis/execute', 'POST', { action: 'add_teacher_note', args: { classId: 'class-6A-test', className: '6/A', note: 'Öğrenciler write testte çok iyiydi.' } });
  console.log(res);
}

run();
