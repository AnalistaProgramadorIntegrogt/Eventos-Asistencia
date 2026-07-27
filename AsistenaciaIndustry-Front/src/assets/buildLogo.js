import fs from 'fs';

const b64 = fs.readFileSync('src/assets/Logo.png').toString('base64');
const content = `export const logoBase64 = "data:image/png;base64,${b64}";\n`;
fs.writeFileSync('src/assets/logoBase64.js', content);
console.log('Logo base64 module created successfully!');
