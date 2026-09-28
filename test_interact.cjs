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
  console.log("Send: Bugün 6/A'da Giving Directions işledik, kaydet.");
  let res = await request('/api/jarvis/interact', 'POST', { message: "Bugün 6/A'da Giving Directions işledik, kaydet.", history: [] });
  console.dir(res, {depth: null});
}

run();
