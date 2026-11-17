
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://savett.cc/en1/download";

const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Origin: "https://savett.cc",
  Referer: BASE_URL,
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
};

function normalizeUrls(value) {
  if (typeof value === "string") {
    const url = value.trim();
    return url ? [url] : [];
  }

  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .filter(item => typeof item === "string" && item.trim())
      .map(item => item.trim());
  }

  return [];
}

async function getCsrf() {
  const response = await axios.get(BASE_URL, {
    headers: { "User-Agent": headers["User-Agent"] },
    timeout: 20000
  });

  const html = response.data;
  const csrf = html.match(
    /name=["']csrf_token["'][^>]*value=["']([^"']+)["']/i
  )?.[1];

  const cookies = response.headers["set-cookie"] || [];
  const cookie = cookies
    .map(value => value.split(";")[0])
    .filter(Boolean)
    .join("; ");

  if (!csrf) {
    throw new Error("Token CSRF tidak ditemukan dari SaveTT.");
  }

  return { csrf, cookie };
}

async function postUrl(url, csrf, cookie) {
  const response = await axios.post(
    BASE_URL,
    new URLSearchParams({
      csrf_token: csrf,
      url
    }).toString(),
    {
      headers: {
        ...headers,
        ...(cookie ? { Cookie: cookie } : {})
      },
      timeout: 30000,
      maxRedirects: 5
    }
  );

  if (typeof response.data !== "string") {
    throw new Error("SaveTT mengembalikan respons yang tidak dikenali.");
  }

  return response.data;
}

function parseHtml(html) {
  const $ = cheerio.load(html);

  const stats = [];
  $("#video-info .my-1 span").each((_, element) => {
    stats.push($(element).text().trim());
  });

  const data = {
    username: $("#video-info h3").first().text().trim(),
    views: stats[0] || "0",
    likes: stats[1] || "0",
    comments: stats[3] || "0",
    shares: stats[4] || "0",
    duration:
      $("#video-info p.text-muted")
        .first()
        .text()
        .replace(/Duration:/i, "")
        .trim() || null,
    type: "video",
    downloads: { nowm: [], wm: [] },
    mp3: [],
    slides: []
  };

  // Photo posts
  const slideElements = $(".carousel-item[data-data]");

  if (slideElements.length) {
    data.type = "photo";

    slideElements.each((_, element) => {
      try {
        const raw = $(element).attr("data-data");
        if (!raw) return;

        const decoded = raw
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");

        const json = JSON.parse(decoded);
        const urls = normalizeUrls(json.URL || json.url);

        urls.forEach(url => {
          data.slides.push({
            index: data.slides.length + 1,
            url
          });
        });
      } catch (error) {
        // Lewati slide yang formatnya tidak valid.
      }
    });

    if (data.slides.length) return data;
  }

  // Video dan audio
  $("#formatselect option").each((_, element) => {
    const label = $(element).text().trim().toLowerCase();
    const raw = $(element).attr("value");

    if (!raw) return;

    try {
      const decoded = raw
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");

      const json = JSON.parse(decoded);
      const urls = normalizeUrls(json.URL || json.url);

      if (!urls.length) return;

      if (label.includes("mp3")) {
        data.mp3.push(...urls);
      } else if (label.includes("watermark")) {
        data.downloads.wm.push(...urls);
      } else if (label.includes("mp4") || label.includes("video")) {
        data.downloads.nowm.push(...urls);
      }
    } catch (error) {
      // Lewati opsi download yang tidak bisa dibaca.
    }
  });

  return data;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const inputUrl = req.query?.url;

  if (!inputUrl || typeof inputUrl !== "string") {
    return res.status(400).json({
      error: "URL is required"
    });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    return res.status(400).json({
      error: "Invalid TikTok URL"
    });
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    !(
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com")
    ) ||
    !["https:", "http:"].includes(parsedUrl.protocol)
  ) {
    return res.status(400).json({
      error: "Please provide a valid TikTok URL"
    });
  }

  try {
    const { csrf, cookie } = await getCsrf();
    const html = await postUrl(parsedUrl.href, csrf, cookie);
    const result = parseHtml(html);

    if (
      !result.username ||
      (
        !result.downloads.nowm.length &&
        !result.downloads.wm.length &&
        !result.mp3.length &&
        !result.slides.length
      )
    ) {
      return res.status(502).json({
        error: "Failed to parse TikTok content",
        details:
          "SaveTT did not return recognizable download links. Its page may have changed or rejected the request."
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "[TikTok API]",
      error.response?.status || "",
      error.message
    );

    return res.status(502).json({
      error: "Failed to download",
      details: error.message || "Upstream service error"
    });
  }
};

      
