const { Readable } = require("stream");
const ALLOWED_HOSTS = /(^|\.)(fbcdn\.net|facebook\.com|fbsbx\.com)$/i;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const q = req.query || {};
    const target = new URL(q.u || "");
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.test(target.hostname))
      return res.status(400).json({ status: false, message: "Host tidak diizinkan." });

    const headers = { "User-Agent": "Mozilla/5.0" };
    if (req.headers.range) headers.Range = req.headers.range;
    const up = await fetch(target, { headers });
    if (!up.ok || !up.body)
      return res.status(502).json({ status: false, message: "Gagal mengambil video." });

    const name = String(q.n || "facebook-video").replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || "facebook-video";
    const h = {
      "Content-Type": up.headers.get("content-type") || "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Disposition": `${q.d ? "attachment" : "inline"}; filename="${name}.mp4"`,
    };
    const len = up.headers.get("content-length");
    const range = up.headers.get("content-range");
    if (len) h["Content-Length"] = len;
    if (range) h["Content-Range"] = range;

    res.writeHead(up.status, h);
    Readable.fromWeb(up.body).pipe(res);
  } catch {
    res.status(400).json({ status: false, message: "Permintaan tidak valid." });
  }
};
module.exports.config = { maxDuration: 60 };
