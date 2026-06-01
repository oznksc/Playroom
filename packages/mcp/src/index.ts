#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { resolve } from "node:path";

const projectPath = process.argv[2] || process.cwd();
const basePath = resolve(projectPath);

const server = createMcpServer(basePath);
const transport = new StdioServerTransport();
await server.connect(transport);
