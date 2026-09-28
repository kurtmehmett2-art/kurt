const { spawn } = require('child_process');
const fetch = require('node-fetch');

const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
let serverOutput = '';

server.stdout.on('data', (data) => {
  serverOutput += data.toString();
  if (data.toString().includes('running on port') || data.toString().includes('http://localhost:3000')) {
    // Server is up, let's test
    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/jarvis/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Sınıflarım hangileri?" })
        });
        const data = await res.json();
        console.log("FETCH RESULT:", data);
      } catch (err) {
        console.log("FETCH ERROR:", err);
      }
      console.log("\nSERVER LOGS:\n" + serverOutput);
      server.kill();
      process.exit(0);
    }, 2000);
  }
});
server.stderr.on('data', (data) => {
  serverOutput += data.toString();
});
