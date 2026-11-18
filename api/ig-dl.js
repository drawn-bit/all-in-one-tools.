const { Readable } = require("stream");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const CDN_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const q = req.query || {};
    const target = new URL(q.u || "");
    if (target.protocol !== "https:" || !CDN_HOSTS.test(target.hostname))
      return res.status(400).json({ status: false, message: "Host tidak diizinkan." });
    const h = { "User-Agent": UA, Referer: "https://www.instagram.com/" };
    if (req.headers.range) h.Range = req.headers.range;
    const up = await fetch(target, { headers: h });
    if (!up.ok || !up.body) return res.status(502).json({ status: false, message: "Gagal mengambil media." });

    const type = up.headers.get("content-type") || "application/octet-stream";
    const ext = type.includes("video") ? "mp4" : type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
    const name = String(q.n || "instagram").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "instagram";
    const out = {
      "Content-Type": type,
      "Content-Disposition": `${q.inline ? "inline" : "attachment"}; filename="${name}.${ext}"`,
      "Accept-Ranges": "bytes",
    };
    for (const k of ["content-length", "content-range"]) if (up.headers.get(k)) out[k] = up.headers.get(k);
    res.writeHead(up.status, out);
    Readable.fromWeb(up.body).pipe(res);
  } catch {
    res.status(400).json({ status: false, message: "Permintaan tidak valid." });
  }
};
module.exports.config = { maxDuration: 60 };
