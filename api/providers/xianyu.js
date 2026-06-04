const DEFAULT_HEADERS = {
  "user-agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8"
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizePrice(value) {
  const matched = String(value || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : 0;
}

function normalizeWants(text) {
  const matched = String(text || "").match(/(\d+(?:\.\d+)?)(万?)/);
  if (!matched) {
    return 0;
  }

  const base = Number(matched[1]);
  return matched[2] === "万" ? Math.round(base * 10000) : Math.round(base);
}

function computeInsights(items, keyword) {
  if (!items.length) {
    return {
      keyword,
      avgPrice: 0,
      lowPrice: 0,
      highPrice: 0,
      medianPrice: 0,
      demandScore: 0,
      competitionScore: 0,
      sampleSize: 0,
      samples: [],
      summary: "没有拿到可分析的闲鱼样本。"
    };
  }

  const prices = items.map((item) => item.price).filter((price) => price > 0).sort((a, b) => a - b);
  const wants = items.map((item) => item.wantCount);
  const avgPrice = prices.length ? Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)) : 0;
  const lowPrice = prices[0] || 0;
  const highPrice = prices[prices.length - 1] || 0;
  const medianPrice = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const avgWants = wants.length ? wants.reduce((sum, value) => sum + value, 0) / wants.length : 0;
  const demandScore = Math.min(100, Math.round(avgWants / 3));
  const competitionScore = Math.min(100, Math.round(items.length * 5));

  return {
    keyword,
    avgPrice,
    lowPrice,
    highPrice,
    medianPrice,
    demandScore,
    competitionScore,
    sampleSize: items.length,
    samples: items.slice(0, 6),
    summary: `闲鱼关键词“${keyword}”共抓取 ${items.length} 条样本，均价约 ¥${avgPrice}，中位价 ¥${medianPrice}。`
  };
}

async function fetchFromGoofish(keyword) {
  const url = `https://www.goofish.com/search?q=${encodeURIComponent(keyword)}`;
  const response = await fetchWithTimeout(url, {
    headers: DEFAULT_HEADERS,
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`闲鱼搜索页请求失败：${response.status}`);
  }

  const html = await response.text();
  const itemMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const items = [];

  for (const match of itemMatches) {
    const block = match[2];
    const href = match[1];
    const title = (block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 80);
    const price = normalizePrice(block.match(/¥\s*(\d+(?:\.\d+)?)/)?.[0] || "");
    const wantCount = normalizeWants(block.match(/(\d+(?:\.\d+)?万?)人想要/)?.[0] || "");

    if (title && price) {
      items.push({
        title,
        price,
        wantCount,
        detailUrl: href.startsWith("http") ? href : `https://www.goofish.com${href}`
      });
    }

    if (items.length >= 12) {
      break;
    }
  }

  return computeInsights(items, keyword);
}

async function resolveXianyuInsights(keyword) {
  if (!keyword || !keyword.trim()) {
    throw new Error("缺少闲鱼搜索关键词。");
  }

  return fetchFromGoofish(keyword.trim());
}

module.exports = {
  resolveXianyuInsights
};