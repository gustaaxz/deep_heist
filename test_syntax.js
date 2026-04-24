const fs = require('fs');
const code = fs.readFileSync('lobby.js', 'utf8');
try {
  new Function(code.replace(/import .*/g, ''));
  console.log("Syntax is fully valid for Node Function wrapper");
} catch(e) {
  console.log("Syntax Error:", e);
}
