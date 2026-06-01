const fs = require('fs');
const glob = require('glob'); // Not available? I'll use simple array of files

const files = [
 'c:/Users/HP/Desktop/SmartPM/frontend/src/app/guards/auth-guard.ts',
 'c:/Users/HP/Desktop/SmartPM/frontend/src/app/components/navbar/navbar.ts',
 'c:/Users/HP/Desktop/SmartPM/frontend/src/app/components/member-dashboard/member-dashboard.ts',
 'c:/Users/HP/Desktop/SmartPM/frontend/src/app/components/login/login.ts',
 'c:/Users/HP/Desktop/SmartPM/frontend/src/app/app.ts'
];

files.forEach(file => {
 if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // For the standard robust decoding block:
  // const base64Url = token.split('.')[1];
  // const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // ---> Add padding here
  const robustPattern = /const base64 = base64Url\.replace\(\/-\/g, '\+'\)\.replace\(\/_\/g, '\/'\);/g;
  const robustReplacement = "let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');\n      base64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');";
  content = content.replace(robustPattern, robustReplacement);
  
  // For the simple decoding:
  // const payload = JSON.parse(atob(token.split('.')[1]));
  const simplePattern = /const payload = JSON\.parse\(atob\(token\.split\('\.'\)\[1\]\)\);/g;
  const simpleReplacement = "let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');\n   b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');\n   const payload = JSON.parse(atob(b64));";
  content = content.replace(simplePattern, simpleReplacement);
  
  // Another case (if exists)
  const simplePattern2 = /const payload = JSON\.parse\(atob\(localStorage\.getItem\('token'\)\!\.split\('\.'\)\[1\]\)\);/g;
  const simpleReplacement2 = "let b64 = localStorage.getItem('token')!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');\n    b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');\n    const payload = JSON.parse(atob(b64));";
  content = content.replace(simplePattern2, simpleReplacement2);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
 }
});
