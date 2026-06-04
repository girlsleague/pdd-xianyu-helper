# pdd-xianyu-helper

一个适合手机端操作的拼多多转闲鱼助手，当前版本已经从纯前端原型升级为“静态前端 + Vercel Serverless API”结构。

## 当前能力

前端可以直接粘贴拼多多商品链接，调用 `/api/parse-product` 获取真实商品信息，并继续调用 `/api/market-insights` 抓取闲鱼搜索参考数据，再自动回填建议售价与闲鱼文案。

## 项目结构

```text
pdd-xianyu-helper/
├─ api/
│  ├─ parse-product.js
│  ├─ market-insights.js
│  └─ providers/
│     ├─ pdd.js
│     └─ xianyu.js
├─ index.html
├─ script.js
├─ sw.js
├─ manifest.json
├─ vercel.json
└─ .env.example
```

## 环境变量

如果你有拼多多开放平台能力，可以在 Vercel 中配置以下变量，以提升解析成功率：

```bash
PDD_CLIENT_ID=
PDD_CLIENT_SECRET=
```

如果没有配置，系统会先尝试访问拼多多移动商品页做公开页解析，但成功率取决于页面是否可访问、是否有反爬限制，以及商品链接本身是否带有效商品标识。

## 部署方式

这个项目适合直接部署到 Vercel。

部署时建议：
1. 导入 GitHub 仓库。
2. 保持默认静态设置。
3. 在 Project Settings -> Environment Variables 中填写 `PDD_CLIENT_ID` 与 `PDD_CLIENT_SECRET`（可选但推荐）。
4. 重新部署后，在手机浏览器打开站点测试。

## 已知限制

拼多多和闲鱼都没有面向这个场景的公开一键转卖接口，所以当前版本属于“真实数据辅助决策”而不是“全自动发布”。其中拼多多解析依赖公开页或开放平台权限，闲鱼市场参考依赖搜索结果页结构，后续如果平台页面改版，需要同步调整 provider 逻辑。
