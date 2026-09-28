
async function askJarvis(message, contextClassId = null) {
  try {
    const res = await fetch('http://localhost:3000/api/jarvis/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, contextClassId })
    });
    const data = await res.json();
    console.log(`\nQ: ${message}`);
    console.log(`Context ID: ${contextClassId}`);
    if(data.error) console.log(`ERROR: ${data.error}`);
    else console.log(`JARVIS: ${data.reply}`);
    console.log("-----------------------------------------");
  } catch (err) {
    console.log("FETCH ERROR:", err);
  }
}

async function run() {
  await askJarvis("6/A hakkında hangi notu almışım?"); // Test 1
  await askJarvis("7/B'de ne yaptık?"); // Test 2
  await askJarvis("6/A'da nerede kaldık?"); // Test 3
  await askJarvis("9/C'de ne yaptık?"); // Test 4
  await askJarvis("Son dersimizi özetler misin?", "class-6A-test"); // Test 5
}

run();
