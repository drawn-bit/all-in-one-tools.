/** Logika metadata: adaptasi Spotdown (Vamz Spectre) | UI & server: Vexora Tools */
const H = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*"
};

const fmt = (s) => (!s || isNaN(s) ? "-" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
const getText = async (url) => {
  const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
};
const trackId = (s) => {
  s = String(s || "").trim();
  const m = s.match(/track\/([a-zA-Z0-9]{22})/i);
  return m ? m[1] : null;
};

// Metadata resmi Spotify (oEmbed + Embed state)
async function spotifyMeta(input) {
  const id = trackId(input);
  const url = `https://open.spotify.com/track/${id}`;
  let title = "Spotify Music", artist = "", album = "", cover = "", duration = "-";
  try {
    const d = JSON.parse(await getText(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`));
    if (d.title) title = d.title;
    if (d.thumbnail_url) cover = d.thumbnail_url;
  } catch {}
  try {
    const html = await getText(`https://open.spotify.com/embed/track/${id}`);
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">({.+?})<\/script>/);
    const e = m && JSON.parse(m[1]).props?.pageProps?.state?.data?.entity;
    if (e) {
      if (e.name) title = e.name;
      if (Array.isArray(e.artists) && e.artists.length) artist = e.artists.map((a) => a.name).join(", ");
      if (e.album?.name) album = e.album.name;
      if (e.duration) duration = fmt(Math.floor(e.duration / 1000));
    }
  } catch {}
  return { title, artist: artist || "Spotify", album, cover, duration, spotify_url: url };
}

// Pencarian via Deezer (katalog + pratinjau 30 detik)
async function deezerSearch(q, limit) {
  const d = JSON.parse(await getText(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`));
  return (d.data || []).map((i) => ({
    title: i.title,
    artist: i.artist?.name || "-",
    album: i.album?.title || "",
    duration: fmt(i.duration),
    cover: i.album?.cover_xl || i.album?.cover_big || i.album?.cover_medium || "",
    preview: i.preview || null,
    spotify_url: `https://open.spotify.com/search/${encodeURIComponent([i.artist?.name, i.title].filter(Boolean).join(" "))}`
  }));
}

async function search(q) {
  q = String(q || "").trim();
  if (!q) return { status: false, message: "Ketik judul lagu atau tempel link Spotify dulu." };
  try {
    // Link pendek dari tombol Bagikan di HP (spotify.link/...) diikuti dulu sampai ketemu link lagunya
    if (/spotify\.link|spotify\.app\.link/i.test(q)) {
      try { q = (await fetch(q, { headers: H, redirect: "follow", signal: AbortSignal.timeout(8000) })).url || q; } catch {}
    }
    if (/open\.spotify\.com/i.test(q)) {
      if (!trackId(q)) return { status: false, message: "Link harus berupa link lagu (open.spotify.com/track/...)." };
      const meta = await spotifyMeta(q);
      const hit = (await deezerSearch(`${meta.artist} ${meta.title}`, 1).catch(() => []))[0] || {};
      return { status: true, results: [{
        ...meta,
        album: meta.album || hit.album || "",
        cover: meta.cover || hit.cover || "",
        preview: hit.preview || null
      }] };
    }
    const results = await deezerSearch(q, 6);
    return results.length ? { status: true, results } : { status: false, message: `Lagu "${q}" tidak ditemukan.` };
  } catch (err) {
    return { status: false, message: err.message || "Terjadi kesalahan saat mencari lagu." };
  }
}


module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const data = await search(req.query && req.query.q);
  res.status(data.status ? 200 : 400).json(data);
};
module.exports.config = { maxDuration: 30 };
