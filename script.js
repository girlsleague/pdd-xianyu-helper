const TEMPLATES = {
    student: {
        prefix: "真的哭了...大一新生求放过！",
        suffix: "宿舍实在没地方放了，求好心人带走，不议价了呜呜呜。"
    },
    moving: {
        prefix: "搬家大甩卖，一件不留！",
        suffix: "下周就要回老家了，带不走真的太可惜了，同城优先，邮寄也行。"
    },
    regret: {
        prefix: "一时冲动买多了，全新未拆封。",
        suffix: "退货太麻烦，直接在这里亏本出了，看中的直接拍。"
    },
    gift: {
        prefix: "公司抽奖中的，家里已经有一个了。",
        suffix: "出给有需要的朋友，完全没拆过，发票都在。"
    }
};

let currentTitle = "精选爆款商品";
let currentStyle = "student";
let latestProduct = null;
let latestInsights = null;

function setStatus(message, type = "info") {
    const statusEl = document.getElementById("parse-status");
    const typeClassMap = {
        info: "bg-blue-50 text-blue-700",
        success: "bg-green-50 text-green-700",
        error: "bg-red-50 text-red-700"
    };

    statusEl.className = `mt-4 text-sm rounded-xl px-4 py-3 ${typeClassMap[type] || typeClassMap.info}`;
    statusEl.textContent = message;
    statusEl.classList.remove("hidden");
}

function hideStatus() {
    document.getElementById("parse-status").classList.add("hidden");
}

function formatPrice(value) {
    const numberValue = Number(value || 0);
    if (!numberValue) {
        return "¥0.00";
    }
    return `¥${numberValue.toFixed(2)}`;
}

function formatSales(value) {
    const sales = Number(value || 0);
    if (!sales) {
        return "销量待确认";
    }
    if (sales >= 10000) {
        return `销量 ${Math.round((sales / 1000)) / 10}万+`;
    }
    return `销量 ${sales}+`;
}

function suggestSellPrice(product, insights) {
    const buyPrice = Number(product?.price || 0);
    const avgPrice = Number(insights?.avgPrice || 0);
    const medianPrice = Number(insights?.medianPrice || 0);
    const reference = avgPrice || medianPrice || 0;

    if (buyPrice && reference) {
        return Number(Math.max(buyPrice * 1.15, reference * 0.96).toFixed(2));
    }

    if (buyPrice) {
        return Number((buyPrice * 1.18).toFixed(2));
    }

    return 0;
}

function buildKeyword(title) {
    if (!title) {
        return "";
    }

    return title
        .replace(/[【】\[\]()（）]/g, " ")
        .replace(/官方|旗舰|正品|包邮|新品|热卖|爆款|拼多多/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 4)
        .join(" ") || title;
}

function updateProductCard(product) {
    document.getElementById("product-card").classList.remove("hidden");
    document.getElementById("product-image").src = product.image || "https://placehold.co/200x200?text=PDD";
    document.getElementById("product-title").textContent = product.title || "未识别标题";
    document.getElementById("product-store").textContent = product.storeName ? `店铺：${product.storeName}` : "店铺信息暂不可见";
    document.getElementById("product-price").textContent = `进货价 ${formatPrice(product.price)}`;
    document.getElementById("product-sales").textContent = formatSales(product.sales);
    document.getElementById("product-source").textContent = product.source === "pdd-open-api" ? "开放平台" : "移动页解析";
}

function updateInsightsCard(insights) {
    document.getElementById("insights-card").classList.remove("hidden");
    document.getElementById("insight-avg-price").textContent = formatPrice(insights.avgPrice);
    document.getElementById("insight-price-range").textContent = `${formatPrice(insights.lowPrice)} - ${formatPrice(insights.highPrice)}`;
    document.getElementById("insight-demand").textContent = `${insights.demandScore}/100`;
    document.getElementById("insight-sample-size").textContent = `${insights.sampleSize}`;
    document.getElementById("insight-summary").textContent = insights.summary || "暂时没有闲鱼市场说明。";
}

async function requestJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
        throw new Error(result.message || "请求失败");
    }
    return result.data;
}

async function parseUrl(event) {
    const url = document.getElementById("pdd-url").value.trim();
    if (!url) {
        setStatus("请先粘贴拼多多商品链接。", "error");
        return;
    }

    const btn = event?.target || document.getElementById("parse-btn");
    const originalText = btn.innerText;
    btn.innerText = "真实解析中...";
    btn.disabled = true;
    hideStatus();

    try {
        setStatus("正在获取拼多多真实商品信息...", "info");
        latestProduct = await requestJson("/api/parse-product", { url });
        currentTitle = latestProduct.title || currentTitle;

        document.getElementById("original-price").value = latestProduct.price || "";
        updateProductCard(latestProduct);

        const keyword = buildKeyword(latestProduct.title);
        setStatus("拼多多解析成功，正在抓取闲鱼市场参考...", "info");
        latestInsights = await requestJson("/api/market-insights", { keyword });
        updateInsightsCard(latestInsights);

        const suggestedPrice = suggestSellPrice(latestProduct, latestInsights);
        if (suggestedPrice) {
            document.getElementById("sell-price").value = suggestedPrice;
        }

        document.getElementById("result-section").classList.remove("hidden");
        updateAIContent();
        setStatus("真实数据已接入成功，可以直接继续生成闲鱼文案。", "success");
        document.getElementById("result-section").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
        console.error(error);
        setStatus(error.message || "解析失败，请稍后再试。", "error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function changeStyle(style, event) {
    currentStyle = style;

    document.querySelectorAll(".style-btn").forEach((btn) => {
        btn.classList.remove("bg-orange-100", "text-orange-600");
        btn.classList.add("bg-gray-100", "text-gray-600");
    });

    const currentButton = event?.target || document.querySelector(`[onclick*="${style}"]`);
    if (currentButton) {
        currentButton.classList.remove("bg-gray-100", "text-gray-600");
        currentButton.classList.add("bg-orange-100", "text-orange-600");
    }

    updateAIContent();
}

function updateAIContent() {
    const template = TEMPLATES[currentStyle];
    const originalPrice = document.getElementById("original-price").value || latestProduct?.price || "0.00";
    const sellPrice = document.getElementById("sell-price").value || suggestSellPrice(latestProduct, latestInsights) || "0.00";
    const marketSummary = latestInsights
        ? `闲鱼同类均价约 ${formatPrice(latestInsights.avgPrice)}，样本 ${latestInsights.sampleSize} 条。`
        : "闲鱼市场数据待补充。";

    const content = `${template.prefix}\n\n【商品】${currentTitle}\n【状态】全新的，仅拆开拍了个照\n【价格】入手价${formatPrice(originalPrice)}，现在${formatPrice(sellPrice)}出\n【说明】${marketSummary}\n【理由】${template.suffix}`;
    document.getElementById("ai-content").innerText = content;
}

function copyContent() {
    const text = document.getElementById("ai-content").innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("文案已复制，快去闲鱼粘贴吧！");
    });
}

function openXianyu() {
    window.location.href = "fleamarket://";
    setTimeout(() => {
        window.location.href = "https://www.goofish.com";
    }, 2000);
}
