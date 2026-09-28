(async () => {
  const res = await fetch('http://localhost:3000/api/jarvis/interact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "Sınıflarım hangileri?" })
  });
  console.log(await res.text());
})();
