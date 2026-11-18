/** Logika ekstraksi: Vamz Spectre / Vamx | UI & server: Vexora Tools */
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const CDN_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

let session = null;
async function getSession() {
  const now = Date.now();
  if (session && session.exp > now && session.csrf) return session;
  const r = await fetch("https://www.instagram.com/", {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.8" },
    redirect: "manual",
    signal: AbortSignal.timeout(10000)
  });
  const raw = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
  const cookies = raw.map((c) => c.split(";")[0]).join("; ");
  const m = cookies.match(/csrftoken=([^;]+)/);
  session = { csrf: m ? m[1] : "", cookies, exp: now + 20 * 60 * 1000 };
  return session;
}

const getShortcode = (url) => {
  const m = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};
const pick = (n) => {
  const thumb = n.image_versions2?.candidates?.[0]?.url || null;
  if (n.video_versions?.length) return { type: "video", url: n.video_versions[0].url, thumb };
  if (thumb) return { type: "image", url: thumb, thumb };
  return null;
};

async function extractInstagramMedia(input) {
  const fail = (message) => ({ status: false, message });
  try {
    let url = String(input || "").trim();
    if (!/instagram\.com/i.test(url)) return fail("Link harus dari instagram.com.");
    if (/instagram\.com\/share\//i.test(url)) {
      const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(10000) });
      url = r.url || url;
    }
    const code = getShortcode(url);
    if (!code) return fail("Link tidak dikenali. Pakai link post atau Reels (instagram.com/p/... atau /reel/...).");

    const post = async (s) => {
      const body = new URLSearchParams({
        variables: JSON.stringify({ shortcode: code, __relay_internal__pv__PolarisAIGMMediaWebLabelEnabledrelayprovider: false }),
        doc_id: "27128499623469141",
        server_timestamps: "true"
      });
      const r = await fetch("https://www.instagram.com/graphql/query", {
        method: "POST",
        headers: {
          "User-Agent": UA, Accept: "*/*", "Accept-Language": "en-US,en;q=0.8",
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": s.csrf, "X-IG-App-ID": "936619743392459",
          Cookie: s.cookies, Referer: `https://www.instagram.com/p/${code}/`
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15000)
      });
      let j = null;
      try { j = await r.json(); } catch {}
      return { ok: r.ok, j };
    };

    let s = await getSession();
    let r = await post(s);
    if (!r.ok || !r.j?.data) { session = null; s = await getSession(); r = await post(s); }

    const item = r.j?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
    if (!item) return fail("Media tidak ditemukan atau akun privat.");

    const nodes = Array.isArray(item.carousel_media) && item.carousel_media.length ? item.carousel_media : [item];
    const items = nodes.map(pick).filter(Boolean);
    if (!items.length) return fail("Link download media tidak ditemukan.");

    return {
      status: true,
      result: {
        username: item.user?.username || "-",
        full_name: item.user?.full_name || "",
        caption: item.caption?.text || "",
        likes: item.like_count ?? 0,
        comments: item.comment_count ?? 0,
        items
      }
    };
  } catch (err) {
    return fail(err.message || "Gagal mengekstrak media Instagram.");
  }
}


module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const data = await extractInstagramMedia(req.query && req.query.url);
  res.status(data.status ? 200 : 400).json(data);
};
module.exports.config = { maxDuration: 30 };
