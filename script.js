const TEMPLATES = {
    student: {
        prefix: "真的哭了...大一新生求放过！",
        suffix: "宿舍实在没地方放了，求好心人带走，不议价了呜呜呜。"
    },
    moving: {
        prefix: "搬家大甩卖，一件不留！",
        suffix: "下周就要回老家了，带不走真的太可惜了，南京自提优先，邮寄也行。"
    },
    regret: {
        prefix: "一时冲动买多了，全新未拆封。",
        suffix: "退货太麻烦，直接在这里亏本出了，看中的直接拍，顺丰包邮。"
    },
    gift: {
        prefix: "公司抽奖中的，家里已经有一个了。",
        suffix: "出给有需要的朋友，完全没拆过，发票都在。"
    }
};

let currentTitle = "精选爆款商品";
let currentStyle = "student";

function parseUrl() {
    const url = document.getElementById('pdd-url').value;
    if (!url) return alert('请先粘贴链接');

    // Show loading state
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "解析中...";
    btn.disabled = true;

    // Simulate parsing logic
    setTimeout(() => {
        document.getElementById('result-section').classList.remove('hidden');
        btn.innerText = originalText;
        btn.disabled = false;

        // Mock a title extraction
        currentTitle = "拼多多高品质爆款好物";
        updateAIContent();

        // Smooth scroll to result
        document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
    }, 1500);
}

function changeStyle(style) {
    currentStyle = style;

    // Update button states
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.remove('bg-orange-100', 'text-orange-600');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    event.target.classList.remove('bg-gray-100', 'text-gray-600');
    event.target.classList.add('bg-orange-100', 'text-orange-600');

    updateAIContent();
}

function updateAIContent() {
    const template = TEMPLATES[currentStyle];
    const content = `${template.prefix}\n\n【商品】${currentTitle}\n【状态】全新的，仅拆开拍了个照\n【理由】${template.suffix}`;
    document.getElementById('ai-content').innerText = content;
}

function copyContent() {
    const text = document.getElementById('ai-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('文案已复制，快去闲鱼粘贴吧！');
    });
}

function openXianyu() {
    // Protocol to open Xianyu App if installed
    window.location.href = "fleamarket://";
    // Fallback after 2 seconds
    setTimeout(() => {
        window.location.href = "https://2.taobao.com";
    }, 2000);
}
