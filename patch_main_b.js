const fs = require("fs");
let c = fs.readFileSync("apps/web/src/main.tsx", "utf8");

c = c.replace(/\{showServerConfig && \([\s\S]*?\}\)/g, "");
c = c.replace(
  /<Button[\s\S]*?onClick=\{\(\) => setShowServerConfig\(!showServerConfig\)\}[\s\S]*?<\/Button>/g,
  "",
);

fs.writeFileSync("apps/web/src/main.tsx", c);
