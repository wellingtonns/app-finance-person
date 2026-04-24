const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const stateHandler = require("./api/state");

const port = Number(process.env.PORT || 80);
const distDir = path.join(__dirname, "dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function createResponseAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    send(body) {
      if (!res.headersSent && !res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
      }
      res.end(body);
    },
    end(body) {
      res.end(body);
    },
  };
}

function serveFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  fs.createReadStream(filePath).pipe(res);
}

function resolveStaticPath(pathname) {
  if (pathname === "/") return path.join(distDir, "index.html");
  if (pathname === "/dashboard") return path.join(distDir, "dashboard.html");
  return path.join(distDir, pathname.replace(/^\/+/, ""));
}

function serveStatic(req, res, pathname) {
  const targetPath = resolveStaticPath(pathname);
  const normalizedPath = path.normalize(targetPath);
  const hasExtension = path.extname(pathname).length > 0;

  if (!normalizedPath.startsWith(distDir)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(normalizedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      serveFile(res, normalizedPath);
      return;
    }

    if (hasExtension) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    const fallback = path.join(distDir, "index.html");
    fs.stat(fallback, (fallbackError, fallbackStats) => {
      if (!fallbackError && fallbackStats.isFile()) {
        serveFile(res, fallback);
        return;
      }
      res.statusCode = 404;
      res.end("Not Found");
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/state") {
    req.query = Object.fromEntries(url.searchParams.entries());
    const adaptedResponse = createResponseAdapter(res);
    stateHandler(req, adaptedResponse);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(port, () => {
  console.log(`[server] app-finance-person running on port ${port}`);
});
