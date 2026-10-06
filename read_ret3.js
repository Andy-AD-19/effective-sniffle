const fs = require("fs");
const c = fs.readFileSync("src/worker.ts", "utf8");
const start = c.indexOf('if (path === "/returns" && method === "POST")');
console.log(c.substring(start, start + 2000));
