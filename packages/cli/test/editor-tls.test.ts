import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, mkdtemp, readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import https from "node:https";
import { createProject, createEmptyScene, projectToJson, sceneToJson } from "@gamekit/schema";
import { startEditorServer, type EditorServerHandle } from "../src/server.js";

function opensslAvailable(): boolean {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function generateTlsFixture(dir: string): {
  ca: string;
  caKey: string;
  serverCert: string;
  serverKey: string;
  clientCert: string;
  clientKey: string;
} {
  const caKey = join(dir, "ca-key.pem");
  const ca = join(dir, "ca.pem");
  const serverKey = join(dir, "server-key.pem");
  const serverCsr = join(dir, "server.csr");
  const serverCert = join(dir, "server-cert.pem");
  const clientKey = join(dir, "client-key.pem");
  const clientCsr = join(dir, "client.csr");
  const clientCert = join(dir, "client-cert.pem");
  const ext = join(dir, "san.cnf");

  const openssl = (args: string[]) =>
    execFileSync("openssl", args, { stdio: ["ignore", "pipe", "pipe"] });
  openssl([
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-keyout",
    caKey,
    "-out",
    ca,
    "-days",
    "1",
    "-nodes",
    "-subj",
    "/CN=PlayroomTestCA",
  ]);
  openssl([
    "req",
    "-newkey",
    "rsa:2048",
    "-keyout",
    serverKey,
    "-out",
    serverCsr,
    "-nodes",
    "-subj",
    "/CN=localhost",
  ]);
  openssl([
    "req",
    "-newkey",
    "rsa:2048",
    "-keyout",
    clientKey,
    "-out",
    clientCsr,
    "-nodes",
    "-subj",
    "/CN=editor-client",
  ]);

  // subjectAltName so Node's TLS stack accepts the server cert for 127.0.0.1.
  writeFileSync(ext, "subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\n");

  openssl([
    "x509",
    "-req",
    "-in",
    serverCsr,
    "-CA",
    ca,
    "-CAkey",
    caKey,
    "-CAcreateserial",
    "-out",
    serverCert,
    "-days",
    "1",
    "-extfile",
    ext,
  ]);
  openssl([
    "x509",
    "-req",
    "-in",
    clientCsr,
    "-CA",
    ca,
    "-CAkey",
    caKey,
    "-CAcreateserial",
    "-out",
    clientCert,
    "-days",
    "1",
  ]);

  return { ca, caKey, serverCert, serverKey, clientCert, clientKey };
}

function httpsGet(
  url: string,
  options: https.RequestOptions = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", ...options }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

const describeTls = opensslAvailable() ? describe : describe.skip;

describeTls("editor HTTPS / mTLS", () => {
  let root: string;
  let tlsDir: string;
  let handle: EditorServerHandle | undefined;
  let certs: ReturnType<typeof generateTlsFixture>;

  beforeEach(async () => {
    root = join(tmpdir(), `playroom-tls-${randomUUID()}`);
    tlsDir = await mkdtemp(join(tmpdir(), "playroom-certs-"));
    const gk = join(root, "gamekit");
    await mkdir(join(gk, "scenes"), { recursive: true });
    await mkdir(join(gk, "assets"), { recursive: true });
    await writeFile(join(gk, "project.json"), projectToJson(createProject("TLS")));
    await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
    certs = generateTlsFixture(tlsDir);
  });

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
    await rm(root, { recursive: true, force: true });
    await rm(tlsDir, { recursive: true, force: true });
  });

  it("serves the editor API over HTTPS", async () => {
    handle = await startEditorServer({
      root,
      host: "127.0.0.1",
      port: 0,
      tls: { cert: certs.serverCert, key: certs.serverKey, ca: certs.ca },
    });
    expect(handle.protocol).toBe("https");
    expect(handle.mtls).toBe(false);
    expect(handle.url.startsWith("https://")).toBe(true);

    const res = await httpsGet(`${handle.url}/api/project`, { ca: await readFile(certs.ca) });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { project: { name: string } };
    expect(body.project.name).toBe("TLS");
  });

  it("rejects clients without a cert when mTLS is enabled", async () => {
    handle = await startEditorServer({
      root,
      host: "127.0.0.1",
      port: 0,
      tls: {
        cert: certs.serverCert,
        key: certs.serverKey,
        ca: certs.ca,
        requestCert: true,
        rejectUnauthorized: true,
      },
    });
    expect(handle.mtls).toBe(true);

    const ca = await readFile(certs.ca);

    await expect(httpsGet(`${handle.url}/api/project`, { ca })).rejects.toThrow();

    const ok = await httpsGet(`${handle.url}/api/project`, {
      ca,
      cert: await readFile(certs.clientCert),
      key: await readFile(certs.clientKey),
    });
    expect(ok.status).toBe(200);
  });
});
