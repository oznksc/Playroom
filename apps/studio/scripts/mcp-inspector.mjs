import { createServer } from "node:http";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "@gamekit/mcp/server";

const basePath = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
const port = Number(process.env.STUDIO_MCP_PORT ?? 4189);

async function main() {
  const server = createMcpServer(basePath);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client(
    { name: "gamekit-studio-inspector", version: "0.1.0" },
    { capabilities: {} },
  );
  await client.connect(clientTransport);

  const http = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    try {
      if (req.method === "GET" && url.pathname === "/tools") {
        const { tools } = await client.listTools();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ tools }));
        return;
      }
      if (req.method === "POST" && url.pathname === "/tools/call") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const { name, arguments: args } = JSON.parse(body || "{}");
        const result = await client.callTool({ name, arguments: args ?? {} });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
  });

  http.listen(port, () => {
    process.stderr.write(`[studio-mcp] inspector listening on :${port} for ${basePath}\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`[studio-mcp] failed: ${String(err)}\n`);
  process.exit(1);
});
