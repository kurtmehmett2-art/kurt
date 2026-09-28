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
  console.log("Send: 6/A için sıradaki dersi hazırla");
  let res = await request('/api/jarvis/interact', 'POST', { message: "6/A için sıradaki dersi hazırla.", history: [] });
  console.dir(res, {depth: null});
}

run();
