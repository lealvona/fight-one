const { createServer } = require("node:http");
const { appendFile, readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 64_000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const events = JSON.parse(body);
        const list = Array.isArray(events) ? events : [events];
        const lines = list.map(event => JSON.stringify({
          receivedAt: new Date().toISOString(),
          ...event
        })).join("\n");
        if (lines) await appendFile(join(root, "game.log"), `${lines}\n`);
        res.writeHead(204).end();
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(String(error.message || error));
      }
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }

  const pathname = req.url.split("?")[0];
  const rawPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    if (req.method === "HEAD") res.end();
    else res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Cadence Fighter running at http://127.0.0.1:${port}/`);
  console.log(`Telemetry log: ${join(root, "game.log")}`);
});
