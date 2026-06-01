#!/usr/bin/env node
import { startMcpServer } from "./server.js";

const projectPath = process.argv[2] || process.cwd();
await startMcpServer(projectPath);
