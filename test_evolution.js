async function test() {
  const API_URL = "https://evo.integro.net.gt";
  const INSTANCE_NAME = "EventosIntegro";
  const API_KEY = "tr@nf0rm@t10n1ntegr0EP1CC";
  const phone = "50212345678"; // dummy number

  const url = `${API_URL}/message/sendMedia/${INSTANCE_NAME}`;
  
  // Try my current payload
  const payload1 = {
    number: phone,
    options: { delay: 1200, presence: "composing" },
    mediaMessage: {
      mediatype: "image",
      caption: "Test",
      media: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }
  };

  try {
    console.log("Testing payload 1...");
    const res1 = await fetch(url, {
      method: 'POST',
      headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1)
    });
    console.log("Status 1:", res1.status);
    console.log("Data 1:", JSON.stringify(await res1.json(), null, 2));
  } catch(e) { console.error(e.message); }

  // Try top-level payload
  const payload2 = {
    number: phone,
    mediatype: "image",
    mimetype: "image/png",
    caption: "Test",
    media: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    fileName: "qr.png"
  };

  try {
    console.log("Testing payload 2...");
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2)
    });
    console.log("Status 2:", res2.status);
    console.log("Data 2:", JSON.stringify(await res2.json(), null, 2));
  } catch(e) { console.error(e.message); }
}

test();
