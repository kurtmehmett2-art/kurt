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
  await askJarvis("6/A'da nerede kaldık?"); // Test 1
  await askJarvis("6/A'da en son ne yaptık?"); // Test 2
  await askJarvis("6/A hakkında hangi notu almışım?"); // Test 3
  await askJarvis("9/C'de en son ne yaptık?"); // Test 4
  await askJarvis("Sınıflarım hangileri?"); // Test 5
  await askJarvis("Son dersimizi özetler misin?", "class-6A-test"); // Test 6
  await askJarvis("6/A'da son iki derste ne yaptık?"); // Test 7
  await askJarvis("8/A'da nerede kaldık?"); // Test 8
  await askJarvis("Bugün hangi sınıflarım var?"); // Test 9
}

run();
