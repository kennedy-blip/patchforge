export async function POST(req: Request) {
  try {
    if (req.headers.get("x-authorized-use") !== "yes")
      throw Error("Authorized use attestation required");
    const max = 104857600;
    const reader = req.body?.getReader();
    if (!reader) throw Error("Empty request");
    let size = 0;
    const parts: Buffer[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw Error("Maximum size is 100 MB");
      }
      parts.push(Buffer.from(value));
    }
    const b = Buffer.concat(parts);
    if (b.readUInt32LE() !== 0x04034b50) throw Error("Not an APK archive");
    let end = b.length - 22;
    while (
      end >= Math.max(0, b.length - 65557) &&
      b.readUInt32LE(end) !== 0x06054b50
    )
      end--;
    if (end < 0 || b.readUInt32LE(end) !== 0x06054b50)
      throw Error("Invalid ZIP directory");
    let p = b.readUInt32LE(end + 16),
      manifest = false;
    for (let j = 0; j < b.readUInt16LE(end + 10); j++) {
      if (b.readUInt32LE(p) !== 0x02014b50) throw Error("Invalid directory");
      let n = b.readUInt16LE(p + 28);
      if (b.toString("utf8", p + 46, p + 46 + n) === "AndroidManifest.xml")
        manifest = true;
      p += 46 + n + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
    }
    if (!manifest) throw Error("AndroidManifest.xml missing");
    return Response.json({ size, manifest });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof RangeError ? "Truncated archive" : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
