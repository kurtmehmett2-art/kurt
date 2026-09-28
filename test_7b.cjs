async function askJarvis() {
  try {
    const res = await fetch('http://localhost:3000/api/jarvis/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "7/B'de ne yaptık?" })
    });
    const data = await res.json();
    console.log(`JARVIS: ${data.reply}`);
  } catch (err) {
    console.log("FETCH ERROR:", err);
  }
}
askJarvis();
