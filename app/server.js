import { join } from "path";
import { existsSync } from "fs";

const BASE_DIR = import.meta.dir;

// Find CLI binary
function getCliPath() {
  const candidates = [
    join(BASE_DIR, "..", "release-assets", "virtuosa-vx5-cli.exe"),
    join(BASE_DIR, "release-assets", "virtuosa-vx5-cli.exe"),
    join(BASE_DIR, "..", "release-assets", "virtuosa-vx5-cli"),
    join(BASE_DIR, "..", "target", "x86_64-pc-windows-gnu", "release", "virtuosa-vx5-cli.exe"),
    join(BASE_DIR, "..", "target", "release", "virtuosa-vx5-cli"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "virtuosa-vx5-cli.exe";
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function runCli(args) {
  const cli = getCliPath();
  try {
    const proc = Bun.spawn([cli, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    return {
      success: exitCode === 0,
      exitCode,
      output: (stdout + "\n" + stderr).trim(),
    };
  } catch (err) {
    return {
      success: false,
      exitCode: -1,
      output: err.message,
    };
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // API Routes
    if (url.pathname === "/api/swap-fn" && req.method === "POST") {
      const res = await runCli(["swap-fn"]);
      return Response.json(res);
    }

    if (url.pathname === "/api/reset-fn" && req.method === "POST") {
      const res = await runCli(["reset-fn"]);
      return Response.json(res);
    }
    if (url.pathname === "/api/set-rgb" && req.method === "POST") {
      return Response.json({
        success: false,
        output: "Fitur penulisan LED ditahan (suspended) demi keamanan hardware sampai verifikasi protokol selesai.",
      });
    }

    if (url.pathname === "/api/handshake" && req.method === "POST") {
      const res = await runCli(["handshake"]);
      return Response.json(res);
    }

    if (url.pathname === "/api/status") {
      const res = await runCli(["inspect"]);
      return Response.json(res);
    }

    // Static Assets
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") pathname = "/index.html";

    const filePath = join(BASE_DIR, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = filePath.slice(filePath.lastIndexOf("."));
      const contentType = MIME_TYPES[ext] || file.type || "application/octet-stream";
      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Virtuosa Control Center running at http://localhost:${server.port}`);
