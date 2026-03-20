import { createServer } from "node:http";

import { handleContributionsRequest } from "./index.js";

const port = Number(process.env.PORT ?? 8787);

const server = createServer(async (req, res) => {
  const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
  const init: RequestInit = {
    headers: req.headers as Record<string, string>
  };

  if (req.method) {
    init.method = req.method;
  }

  const request = new Request(new URL(req.url ?? "/", origin), init);

  if (req.method !== "GET" || !req.url?.startsWith("/api/contributions")) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const response = await handleContributionsRequest(request);
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(await response.text());
});

server.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
