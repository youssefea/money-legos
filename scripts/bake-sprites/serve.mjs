import { createServer } from "vite";
import { fileURLToPath } from "node:url";

/** Starts the harness and returns { url, close }. */
export async function serve() {
  const server = await createServer({ configFile: fileURLToPath(new URL("./vite.config.mts", import.meta.url)) });
  await server.listen();
  const addr = server.httpServer.address();
  const url = `http://localhost:${addr.port}/scripts/bake-sprites/index.html`;
  return { url, close: () => server.close() };
}

/** Real GPU in headless bundled Chromium (ANGLE on Metal on macOS). SWIFTSHADER=1 for the software path. */
export const GPU_ARGS =
  process.env.SWIFTSHADER === "1"
    ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
    : ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default"];

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await serve();
  console.log(url);
}
