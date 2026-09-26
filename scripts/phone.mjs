// Prints the address to open on a phone on the same Wi-Fi, with a QR code to scan.
import { networkInterfaces } from "node:os";
import qrcode from "qrcode-terminal";

const port = process.env.PORT ?? "2048";
const addrs = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

if (addrs.length === 0) {
  console.log("No network address found — are you connected to Wi-Fi?");
  process.exit(1);
}

const url = `http://${addrs[0]}:${port}`;
console.log("\nOpen this on your phone (same Wi-Fi network):\n");
console.log(`  ${url}\n`);
qrcode.generate(url, { small: true });
console.log("\nTip: once open, use Share → Add to Home Screen (iPhone) or the Install prompt (Android)");
console.log("     to play full-screen. Run `npm run dev` or `npm start` first.\n");
