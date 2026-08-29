package com.playroom.runtime.debug;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Tiny HTTP/1.1 JSON server that works on desktop JVM and Android.
 * All game-state routes hop onto the libGDX render thread via {@code Gdx.app.postRunnable}.
 */
public final class DebugHttpServer {
    public static final int DEFAULT_PORT = 17478;
    private static final int MAX_BODY = 1_000_000;

    private final DebugApi api;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ServerSocket serverSocket;
    private Thread acceptThread;
    private int boundPort = DEFAULT_PORT;

    public DebugHttpServer(DebugApi api) {
        this.api = api;
    }

    public int getPort() {
        return boundPort;
    }

    public void start() {
        if (running.get()) return;
        int preferred = DEFAULT_PORT;
        try {
            String env = System.getenv("PLAYROOM_DEBUG_PORT");
            if (env != null && !env.isBlank()) preferred = Integer.parseInt(env.trim());
        } catch (Exception ignored) {}
        try {
            String prop = System.getProperty("playroom.debug.port");
            if (prop != null && !prop.isBlank()) preferred = Integer.parseInt(prop.trim());
        } catch (Exception ignored) {}

        Exception last = null;
        for (int port = preferred; port < preferred + 10; port++) {
            try {
                serverSocket = new ServerSocket();
                serverSocket.setReuseAddress(true);
                serverSocket.bind(new InetSocketAddress("0.0.0.0", port));
                boundPort = port;
                last = null;
                break;
            } catch (Exception e) {
                last = e;
                try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
                serverSocket = null;
            }
        }
        if (serverSocket == null) {
            Gdx.app.error("PlayroomDebug", "Failed to bind debug HTTP port: " + last);
            return;
        }

        DebugController.get().port = boundPort;
        running.set(true);
        writePortFile();

        acceptThread = new Thread(this::acceptLoop, "playroom-debug-http");
        acceptThread.setDaemon(true);
        acceptThread.start();
        Gdx.app.log("PlayroomDebug", "Debug HTTP listening on 0.0.0.0:" + boundPort);
        System.out.println("PLAYROOM_DEBUG_LISTEN port=" + boundPort);
    }

    public void stop() {
        running.set(false);
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
        if (acceptThread != null) acceptThread.interrupt();
    }

    private void writePortFile() {
        try {
            String json = DebugJson.obj(
                "port", boundPort,
                "startedAt", System.currentTimeMillis()
            );
            FileHandle fh = Gdx.files.local("playroom-debug.json");
            fh.writeString(json, false);
        } catch (Exception e) {
            Gdx.app.error("PlayroomDebug", "Could not write playroom-debug.json", e);
        }
    }

    private void acceptLoop() {
        while (running.get()) {
            try {
                Socket socket = serverSocket.accept();
                socket.setSoTimeout(10000);
                Thread t = new Thread(() -> handleSocket(socket), "playroom-debug-conn");
                t.setDaemon(true);
                t.start();
            } catch (Exception e) {
                if (running.get()) {
                    Gdx.app.error("PlayroomDebug", "accept failed", e);
                }
            }
        }
    }

    private void handleSocket(Socket socket) {
        try (Socket auto = socket) {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            String requestLine = readLine(in);
            if (requestLine == null || requestLine.isBlank()) return;
            String[] parts = requestLine.split(" ");
            String method = parts.length > 0 ? parts[0] : "GET";
            String uri = parts.length > 1 ? parts[1] : "/";

            Map<String, String> headers = new HashMap<>();
            String headerLine;
            while ((headerLine = readLine(in)) != null && !headerLine.isEmpty()) {
                int colon = headerLine.indexOf(':');
                if (colon > 0) {
                    headers.put(headerLine.substring(0, colon).trim().toLowerCase(), headerLine.substring(colon + 1).trim());
                }
            }

            int contentLength = 0;
            try {
                contentLength = Integer.parseInt(headers.getOrDefault("content-length", "0"));
            } catch (Exception ignored) {}
            if (contentLength > MAX_BODY) contentLength = MAX_BODY;
            byte[] bodyBytes = readExact(in, contentLength);
            String body = new String(bodyBytes, StandardCharsets.UTF_8);

            String path = uri;
            String query = "";
            int q = uri.indexOf('?');
            if (q >= 0) {
                path = uri.substring(0, q);
                query = uri.substring(q + 1);
            }
            Map<String, String> queryMap = parseQuery(query);

            if ("OPTIONS".equalsIgnoreCase(method)) {
                writeResponse(out, 204, "application/json", "");
                return;
            }

            String json;
            try {
                json = dispatch(method, path, queryMap, body);
            } catch (Exception e) {
                json = DebugJson.obj("ok", false, "error", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
            }
            writeResponse(out, 200, "application/json; charset=utf-8", json);
        } catch (Exception e) {
            // connection dropped
        }
    }

    private String dispatch(String method, String path, Map<String, String> query, String body) throws Exception {
        if ("/health".equals(path) || "/capabilities".equals(path)) {
            return api.handle(method, path, query, body);
        }
        if (Gdx.app == null) {
            return DebugJson.obj("ok", false, "error", "Gdx.app is not ready yet");
        }
        CompletableFuture<String> future = new CompletableFuture<>();
        Gdx.app.postRunnable(() -> {
            try {
                future.complete(api.handle(method, path, query, body));
            } catch (Throwable t) {
                future.complete(DebugJson.obj(
                    "ok", false,
                    "error", t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage(),
                    "exception", t.getClass().getName()
                ));
            }
        });
        return future.get(8, TimeUnit.SECONDS);
    }

    private static void writeResponse(OutputStream out, int status, String contentType, String body) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String reason = status == 204 ? "No Content" : "OK";
        String header =
            "HTTP/1.1 " + status + " " + reason + "\r\n" +
            "Content-Type: " + contentType + "\r\n" +
            "Content-Length: " + bytes.length + "\r\n" +
            "Connection: close\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type\r\n" +
            "\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII));
        if (bytes.length > 0) out.write(bytes);
        out.flush();
    }

    private static String readLine(InputStream in) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int prev = -1;
        while (true) {
            int b = in.read();
            if (b < 0) {
                if (buf.size() == 0) return null;
                break;
            }
            if (b == '\n') break;
            if (prev == '\r' && b != '\n') buf.write(prev);
            if (b != '\r') buf.write(b);
            prev = b;
            if (buf.size() > 8192) break;
        }
        return buf.toString(StandardCharsets.UTF_8);
    }

    private static byte[] readExact(InputStream in, int length) throws Exception {
        if (length <= 0) return new byte[0];
        byte[] buf = new byte[length];
        int off = 0;
        while (off < length) {
            int n = in.read(buf, off, length - off);
            if (n < 0) break;
            off += n;
        }
        if (off == length) return buf;
        byte[] slim = new byte[off];
        System.arraycopy(buf, 0, slim, 0, off);
        return slim;
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            if (eq < 0) map.put(urlDecode(part), "");
            else map.put(urlDecode(part.substring(0, eq)), urlDecode(part.substring(eq + 1)));
        }
        return map;
    }

    private static String urlDecode(String s) {
        try {
            return java.net.URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
