import fetch from 'node-fetch'; // The backend might have it now, or I can use native fetch

async function test() {
  try {
    const res = await fetch('http://localhost:5001/api/health');
    const text = await res.text();
    console.log("Health:", text);

    const eventId = "30e01083-d93d-4c3d-bc8f-287714fc04d7"; // Just an example ID if I had it
  } catch (err) {
    console.error(err);
  }
}
test();
