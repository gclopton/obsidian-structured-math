import esbuild from "esbuild";
import { createServer, type Server } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface BrowserFixture {
  server: Server;
  url: string;
}

export async function buildBrowserFixture(entryPoint: string, outDir: string): Promise<BrowserFixture> {
  await mkdir(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    target: "es2022",
    outfile: path.join(outDir, "entry.js"),
    logLevel: "silent",
  });

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const filePath = requestUrl.pathname === "/"
      ? path.join(outDir, "index.html")
      : path.join(outDir, decodeURIComponent(requestUrl.pathname.slice(1)));

    try {
      if (requestUrl.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<!doctype html><html><body><div id=\"app\"></div><script type=\"module\" src=\"/entry.js\"></script></body></html>");
        return;
      }

      const file = await readFile(filePath);
      res.writeHead(200, { "content-type": "text/javascript" });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No browser fixture address.");
  return { server, url: `http://127.0.0.1:${address.port}` };
}
