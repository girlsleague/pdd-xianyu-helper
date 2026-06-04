const DEFAULT_HEADERS = {
  "user-agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8"
};

function extractProductId(input) {
  if (!input) {
    return "";
  }

  const matchedId = String(input).match(/goods(?:_id)?=(\d{6,})|goods_id\/(\d{6,})|duo_id=(\d{6,})|id=(\d{6,})/i);
  if (matchedId) {
    return matchedId.slice(1).find(Boolean) || "";
  }

  const longDigits = String(input).match(/\d{10,}/);
  return longDigits ? longDigits[0] : "";
}

function buildOpenApiUrl(goodsId) {
  const clientId = process.env.PDD_CLIENT_ID;
  const clientSecret = process.env.PDD_CLIENT_SECRET;

  if (!clientId || !clientSecret || !goodsId) {
    return "";
  }

  const timestamp = Math.floor(Date.now() / 1000);
  return `https://gw-api.pinduoduo.com/api/router?type=pdd.ddk.goods.detail&client_id=${encodeURIComponent(clientId)}&timestamp=${timestamp}&data_type=JSON&goods_sign_list=[\"${goodsId}\"]`;
}

function normalizeFromOpenApi(payload, goodsId) {
  const firstItem = payload?.goods_detail_response?.goods_details?.[0];
  if (!firstItem) {
    return null;
  }

  const price = Number(firstItem.min_group_price || firstItem.min_normal_price || 0) / 100;
  const originalPrice = Number(firstItem.market_price || firstItem.max_normal_price || 0) / 100;
  const sales = Number(firstItem.sales_tip || firstItem.sales || 0);

  return {
    source: "pdd-open-api",
    goodsId: String(firstItem.goods_id || goodsId || ""),
    title: firstItem.goods_name || "",
    price,
    originalPrice,
    sales,
    storeName: firstItem.mall_name || "",
    image: firstItem.goods_thumbnail_url || firstItem.goods_image_url || "",
    images: Array.isArray(firstItem.goods_gallery_urls) ? firstItem.goods_gallery_urls : [],
    detailUrl: firstItem.mobile_short_url || firstItem.goods_gallery_urls?.[0] || "",
    tags: Array.isArray(firstItem.unified_tags) ? firstItem.unified_tags : [],
    description: firstItem.goods_desc || "",
    raw: firstItem
  };
}

function pickTextByLabel(rawText, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[：:]?\\s*([^\\n]+)`);
    const matched = rawText.match(pattern);
    if (matched?.[1]) {
      return matched[1].trim();
    }
  }
  return "";
}

function normalizePrice(priceText) {
  if (!priceText) {
    return 0;
  }

  const matched = String(priceText).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : 0;
}

function normalizeSales(rawText) {
  if (!rawText) {
    return 0;
  }

  const matched = String(rawText).match(/(\d+(?:\.\d+)?)(万?)/);
  if (!matched) {
    return 0;
  }

  const value = Number(matched[1]);
  return matched[2] === "万" ? Math.round(value * 10000) : Math.round(value);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromMobilePage(rawUrl, goodsId) {
  const candidateUrls = [];

  if (rawUrl) {
    candidateUrls.push(rawUrl);
  }
  if (goodsId) {
    candidateUrls.push(`https://mobile.yangkeduo.com/goods.html?goods_id=${goodsId}`);
    candidateUrls.push(`https://mobile.yangkeduo.com/goods${goodsId}.html`);
  }

  for (const url of candidateUrls) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: DEFAULT_HEADERS,
        redirect: "follow"
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      if (!html || html.length < 100) {
        continue;
      }

      const title = (html.match(/<title>([^<]+)<\/title>/i)?.[1] || "").replace(/-拼多多.*$/, "").trim();
      const ldJsonMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      const ldJson = ldJsonMatch ? JSON.parse(ldJsonMatch[1]) : null;
      const image = Array.isArray(ldJson?.image) ? ldJson.image[0] : ldJson?.image || "";
      const description = ldJson?.description || "";
      const offers = Array.isArray(ldJson?.offers) ? ldJson.offers[0] : ldJson?.offers;
      const price = normalizePrice(offers?.price || pickTextByLabel(html, ["券后价", "拼单价", "单买价", "现价"]));
      const originalPrice = normalizePrice(pickTextByLabel(html, ["原价", "市场价", "划线价"]));
      const sales = normalizeSales(pickTextByLabel(html, ["已拼", "销量", "已售"]));
      const storeName = pickTextByLabel(html, ["店铺", "商家", "旗舰店"]);

      if (!title && !image) {
        continue;
      }

      return {
        source: "pdd-mobile-page",
        goodsId,
        title,
        price,
        originalPrice,
        sales,
        storeName,
        image,
        images: image ? [image] : [],
        detailUrl: url,
        tags: [],
        description,
        raw: {
          title,
          price,
          originalPrice,
          sales,
          storeName,
          detailUrl: url
        }
      };
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function resolvePddProduct(rawUrl) {
  const goodsId = extractProductId(rawUrl);

  const openApiUrl = buildOpenApiUrl(goodsId);
  if (openApiUrl) {
    try {
      const response = await fetchWithTimeout(openApiUrl, {
        headers: DEFAULT_HEADERS
      });

      if (response.ok) {
        const payload = await response.json();
        const normalized = normalizeFromOpenApi(payload, goodsId);
        if (normalized) {
          return normalized;
        }
      }
    } catch (error) {
      // Fall through to public page parsing.
    }
  }

  const fallback = await fetchFromMobilePage(rawUrl, goodsId);
  if (fallback) {
    return fallback;
  }

  throw new Error("未能获取拼多多真实商品数据，请检查链接是否可访问，或补充开放平台凭据。");
}

module.exports = {
  resolvePddProduct,
  extractProductId
};