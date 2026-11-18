# Whale Balance — Hermes Desktop 插件

DeepSeek 余额常驻挂件（原生 Hermes Desktop，非浏览器 dashboard）。

## 功能
- **状态栏右侧**：常驻余额 pill（🐋 ¥45.76），鼠标悬停显示今日已用/峰谷，点击刷新；每 60 秒自动刷新。
- **会话栏左侧**：「余额明细」导航入口，点击打开详情 pane。
- 后端 API：本仓库 `dashboard/plugin_api.py`，挂载在 `GET /api/plugins/whale-balance/balance`。

## 数据来源与口径
- 余额＝DeepSeek 官方接口 `api.deepseek.com/user/balance`（实时、权威）。
- 今日已用＝服务器 admin `state.db` 本地估算（`session_model_usage`）。
- 汇率＝open.er-api；峰谷＝工作日 09–12/14–18 为高峰。
- 二者非同源，仅供对照。密钥留在服务器、不回显、不进前端 bundle。

## 安装（Hermes Desktop GUI）
1. 打开桌面应用 → Capabilities（能力）▸ Plugins（插件）。
2. 选「Install from Git repository」。
3. 填入：`https://github.com/qq4851171-blip/hermes-whale-balance.git`（私有仓库，需 GitHub 登录态）。
4. 安装后在插件列表启用 **Whale Balance**（`defaultEnabled: false`）。
5. 状态栏出现 🐋 余额即成功；如显示 🐋 —，检查服务器网关的 `plugins.enabled` 是否含 `whale-balance`。

## 服务器侧前提（已由 admin 配置）
- admin `config.yaml` → `plugins.enabled` 含 `whale-balance`（API 才会挂载）。
- admin `.env` 含 `DEEPSEEK_API_KEY`。

## 版本
1.0.0 / 2026-11-18
