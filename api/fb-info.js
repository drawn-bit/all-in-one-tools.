/** Downloader core: Vamz Spectre (MIT) | UI & server: Vexora Tools */
/* ====== KODE DOWNLOADER (dari Vamz Spectre) ====== */
function decodeFbUrl(raw) {
  if (!raw) return "";
  try { return JSON.parse(`"${raw}"`); }
  catch {
    return raw.replace(/\\u0025/g, "%").replace(/\\u0026/g, "&")
      .replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  }
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}
function normalizeFacebookUrl(url) {
  const u = url.trim();
  const m = u.match(/(?:facebook\.com|fb\.watch)\/reel\/(\d+)/i);
  return m && m[1] ? `https://www.facebook.com/watch/?v=${m[1]}` : u;
}
async function downloadFacebook(fbUrl) {
  const fail = (message) => ({ status: false, message });
  if (!fbUrl || typeof fbUrl !== "string") return fail("Link Facebook wajib diisi.");
  const cleanUrl = normalizeFacebookUrl(fbUrl);
  if (!/facebook\.com|fb\.watch/i.test(cleanUrl))
    return fail("Link tidak valid. Harus dari facebook.com atau fb.watch.");

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    "Sec-Ch-Ua-Mobile": "?0", "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1", "Upgrade-Insecure-Requests": "1"
  };
  try {
    const res = await fetch(cleanUrl, { headers, redirect: "follow" });
    if (!res.ok) return fail(`Gagal memuat halaman Facebook (HTTP ${res.status})`);
    const html = await res.text();

    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) || html.match(/"playable_url_quality_hd":"([^"]+)"/) ||
      html.match(/"hd_src":"([^"]+)"/) || html.match(/"hd_src_no_ratelimit":"([^"]+)"/);
    let hdUrl = hdMatch && hdMatch[1] ? decodeFbUrl(hdMatch[1]) : "";

    const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/) || html.match(/"playable_url":"([^"]+)"/) ||
      html.match(/"sd_src":"([^"]+)"/) || html.match(/"sd_src_no_ratelimit":"([^"]+)"/);
    let sdUrl = sdMatch && sdMatch[1] ? decodeFbUrl(sdMatch[1]) : "";

    if (!hdUrl && !sdUrl) {
      const og = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
        html.match(/<meta\s+content="([^"]+)"\s+property="og:video"/i) ||
        html.match(/"video":\s*\[\s*\{\s*"url":\s*"([^"]+)"/i);
      if (og && og[1]) sdUrl = decodeFbUrl(og[1]);
    }
    if (!hdUrl && !sdUrl)
      return fail("Video tidak ditemukan. Pastikan video publik dan link masih aktif.");

    const tm = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const title = tm && tm[1] ? decodeHtmlEntities(decodeFbUrl(tm[1].replace(/ \| Facebook$/i, "").trim())) : "";

    const thm = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
      html.match(/"preferred_thumbnail":{"image":{"uri":"([^"]+)"/i);
    const thumbnail = thm && thm[1] ? decodeHtmlEntities(decodeFbUrl(thm[1])) : "";

    const dm = html.match(/"playable_duration_in_ms":(\d+)/);
    const duration = dm && dm[1] ? Math.round(Number(dm[1]) / 1000) : null;

    const medias = [];
    if (hdUrl) medias.push({ quality: "HD", url: hdUrl });
    if (sdUrl) medias.push({ quality: "SD", url: sdUrl });

    return { status: true, result: { title: title || "Facebook Video", duration, thumbnail: thumbnail || null, medias } };
  } catch (err) {
    return fail(err.message || "Terjadi kesalahan saat memproses video Facebook");
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const url = req.query && req.query.url;
  const data = await downloadFacebook(url);
  res.status(data.status ? 200 : 400).json(data);
};
module.exports.config = { maxDuration: 30 };
