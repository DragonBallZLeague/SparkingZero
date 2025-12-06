// Quick test of /api/submit
const payload = {
  name: "TestUser",
  comments: "Smoke test",
  targetPath: "Tests/Budokai",
  files: [
    {
      name: "sample.json",
      content: Buffer.from(JSON.stringify({ ping: "pong" })).toString('base64')
    }
  ]
};

const url = "https://sparking-zero-iota.vercel.app/api/submit";

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(e => console.error("Error:", e.message));
