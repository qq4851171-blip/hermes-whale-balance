/**
 * Whale Balance — DeepSeek 余额常驻挂件 (desktop half).
 *
 * 两处贡献：
 *  1) 状态栏右侧余额 pill（实时数字，最接近 DSH 小鲸鱼挂件）
 *  2) 会话栏左侧明细入口（导航链接，点击跳到 /whale-balance 详情页）
 *
 * 后端走 ctx.rest，namespace 自动限定到 /api/plugins/whale-balance/*
 * （dashboard/plugin_api.py 的 GET /balance）。纯 SDK consumer，零核心源码改动。
 */
import {
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  STATUSBAR_AREAS,
  Tip,
  useQuery
} from '@hermes/plugin-sdk'
import { jsx } from 'react/jsx-runtime'
import { useState } from 'react'

const ID = 'whale-balance'
const REFRESH_MS = 60_000
const KEY = ['whale-balance', 'snapshot']

const CSS = `
.hermes-whale-pill{display:flex;align-items:center;gap:4px;height:100%;padding:0 6px;cursor:pointer;
  font-family:var(--font-mono,monospace);font-size:11px;line-height:1;color:var(--ui-text-secondary)}
.hermes-whale-pill[data-peak=true]{color:var(--ui-accent)}
.hermes-whale-pill:hover{color:var(--ui-text-primary)}
.hermes-whale-ico{font-size:12px}
.hermes-whale-err{color:var(--ui-text-tertiary)}
.hermes-whale-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;max-width:560px;display:grid;gap:8px}
.hermes-whale-bal{font-size:38px;font-weight:800;line-height:1.05;color:var(--accent);font-variant-numeric:tabular-nums}
.hermes-whale-bal .cur{font-size:19px;vertical-align:8px;margin-right:2px}
.hermes-whale-bal .unit{font-size:12px;font-weight:600;color:var(--muted-foreground);margin-left:6px;vertical-align:7px}
.hermes-whale-sub,.hermes-whale-note{font-size:11.5px;color:var(--muted-foreground);line-height:1.5}
.hermes-whale-rule{height:1px;background:var(--border);opacity:.6}
.hermes-whale-row{display:flex;align-items:baseline;justify-content:space-between;gap:20px}
.hermes-whale-row .k{font-size:12.5px;color:var(--foreground);font-weight:600}
.hermes-whale-row .v{font-size:15px;font-weight:700;color:var(--foreground);font-variant-numeric:tabular-nums}
.hermes-whale-mono{font-family:var(--font-mono,ui-monospace,monospace);font-size:10.5px;opacity:.85}
.hermes-whale-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:9px;border:1px solid var(--border)}
.hermes-whale-badge.peak{background:rgba(148,163,184,.22);color:var(--muted-foreground)}
.hermes-whale-badge.valley{background:rgba(59,130,246,.16);color:var(--accent);border-color:var(--accent)}
.hermes-whale-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:10px;color:var(--muted-foreground);opacity:.85}
.hermes-whale-refresh{cursor:pointer;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:11px;font-weight:600;color:var(--accent);background:transparent}
.hermes-whale-refresh:hover{background:var(--accent);color:var(--card)}
/* 会话栏入口:保持与默认导航项同构(16px codicon 图标位 + 纯文字 label)，
   仅把图标字形的视觉替换为 🐋，对齐/尺寸/行高完全沿用系统默认。
   wallet 图标系统内仅本插件使用，故直接用类名定位，不依赖 DOM 层级/data 属性。 */
i.codicon-wallet{
  font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif !important;
  font-size:14px !important; line-height:1 !important;
  display:inline-flex !important; align-items:center !important; justify-content:center !important;
}
i.codicon-wallet::before{content:'🐋' !important}
`

function useBalance(rest) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => rest('/balance'),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true
  })
}

function WhalePill({ rest }) {
  const [tick, setTick] = useState(0)
  const { data } = useQuery({
    queryKey: [KEY[0], 'snapshot', tick],
    queryFn: () => rest('/balance'),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true
  })
  if (!data) return jsx('span', { className: 'hermes-whale-pill hermes-whale-err', title: '鲸鱼余额：连接中…', children: '🐋 …' })
  if (!data.ok) return jsx(Tip, { label: data.error || '余额接口不可用', children: jsx('span', { className: 'hermes-whale-pill hermes-whale-err', children: '🐋 —' }) })
  const label = `¥${Number(data.total).toFixed(2)}`
  const tip = `DeepSeek 余额 ${label} ${data.currency}\n今日已用 $${data.today_usd}${data.today_cny_est != null ? ` ≈ ¥${data.today_cny_est}` : ''}\n${data.peak ? '高峰时段' : '空闲时段'} · ${data.updated} CST\n点击刷新`
  return jsx(Tip, { label: tip, children:
    jsx('span', {
      className: 'hermes-whale-pill',
      'data-peak': String(data.peak),
      role: 'button',
      tabIndex: 0,
      title: '点击刷新余额',
      onClick: () => setTick(t => t + 1),
      children: [
        jsx('span', { className: 'hermes-whale-ico', children: '🐋' }),
        label
      ]
    })
  })
}

const WHALE_SVG = '<svg width="72" height="46" viewBox="0 0 80 50" aria-label="鲸鱼"><path d="M6 30 C6 16 24 10 44 14 C56 16 62 22 66 26 L76 18 L73 28 L76 38 L65 30 C58 38 44 42 30 40 C16 38 6 38 6 30 Z" fill="currentColor" opacity="0.92"/><path d="M10 34 Q35 43 60 31" fill="none" stroke="var(--card)" stroke-width="2" opacity="0.55"/><circle cx="18" cy="26" r="2.1" fill="var(--card)"/><circle cx="31" cy="8" r="2.4" fill="currentColor" opacity="0.55"/><circle cx="37" cy="4" r="1.7" fill="currentColor" opacity="0.4"/><circle cx="43" cy="9" r="1.3" fill="currentColor" opacity="0.35"/></svg>'

const fmt = n => Number(n || 0).toLocaleString('en-US')

function WhalePage({ rest }) {
  const [tick, setTick] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: [KEY[0], 'detail', tick],
    queryFn: () => rest('/balance'),
    refetchInterval: REFRESH_MS
  })
  if (isLoading || !data) return jsx('div', { className: 'hermes-whale-card', children: '🐋 余额加载中…' })
  if (!data.ok) return jsx('div', { className: 'hermes-whale-card', children: `🐋 取数失败：${data.error || '未知'}` })
  const row = (k, v) => jsx('div', { className: 'hermes-whale-row', children: [
    jsx('span', { className: 'k', children: k }), jsx('span', { className: 'v', children: v })] })
  const note = t => jsx('div', { className: 'hermes-whale-note', children: t })
  const bal = Number(data.total).toFixed(2)
  const est = data.today_cny_est != null ? ` ≈ ¥${data.today_cny_est}` : ''
  const models = (data.models || [])
  const modelLine = '模型：' + (models.length
    ? models.join(' · ') : '（今日无模型调用记录）')
  const rows = (data.rows || []).filter(r => r.usd > 0)
  const tokLine = rows.length
    ? rows.map(r => `${r.model}: 入 ${fmt(r.tin)} / 出 ${fmt(r.tout)} / 缓存 ${fmt(r.tcache)}`).join(' · ')
    : '今日无计费 token 明细'
  const rateNote = data.rate ? `汇率 ${Number(data.rate).toFixed(4)}（open.er-api）` : '汇率源不可用，仅显示 USD'
  const badgeCls = data.peak ? 'peak' : 'valley'
  const badgeTxt = data.peak ? 'PEAK · 全价' : '谷价 · ×0.5'
  return jsx('div', { className: 'hermes-whale-card', children: [
    jsx('div', { className: 'hermes-whale-row', children: [
      jsx('span', { style: { color: 'var(--accent)', display: 'inline-flex' }, dangerouslySetInnerHTML: { __html: WHALE_SVG } }),
      jsx('strong', { children: 'DeepSeek 余额 · 鲸鱼卡' })] }),
    jsx('div', { className: 'hermes-whale-bal', children: [
      jsx('span', { className: 'cur', children: '¥' }), bal,
      jsx('span', { className: 'unit', children: data.currency || 'CNY' })] }),
    note(`平台权威接口 · ${data.available ? '可用' : '不可用'} · 全额充值 ¥${bal}`),
    jsx('div', { className: 'hermes-whale-rule' }),
    row('今日已用（本地估算）', `$${Number(data.today_usd).toFixed(3)}${est}`),
    note(modelLine),
    jsx('div', { className: 'hermes-whale-note hermes-whale-mono', children: tokLine }),
    jsx('div', { className: 'hermes-whale-row', children: [
      jsx('span', { className: 'k', children: '峰谷状态' }),
      jsx('span', { className: 'hermes-whale-badge ' + badgeCls, children: badgeTxt })] }),
    note(`${data.peak ? '高峰时段' : '空闲时段'}（工作日 09–12 / 14–18 为高峰，其余及周末谷价）`),
    jsx('div', { className: 'hermes-whale-rule' }),
    jsx('div', { className: 'hermes-whale-foot', children: [
      jsx('span', { children: `${data.updated} CST · ${rateNote}` }),
      jsx('span', { className: 'hermes-whale-refresh', role: 'button', tabIndex: 0,
        onClick: () => setTick(t => t + 1), children: '↻ 刷新' })] }),
    note('余额＝平台实时接口；今日已用＝本机 state.db 估算，二者非同源，仅供对照。')
  ] })
}

export default {
  id: ID,
  name: 'Whale Balance',
  description: 'DeepSeek 余额常驻挂件：状态栏 pill + 会话栏明细入口',
  version: '1.0.0',
  defaultEnabled: true,
  register(ctx) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.append(style)
    ctx.onDispose(() => style.remove())

    // 状态栏余额 pill
    ctx.register({
      id: 'balance-pill',
      area: STATUSBAR_AREAS.right,
      order: 90,
      render: () => jsx(WhalePill, { rest: ctx.rest })
    })

    // 会话栏明细入口（此槽只收导航链接：path/label/codicon）
    ctx.register({
      id: 'whale-nav',
      area: SIDEBAR_NAV_AREA,
      order: 90,
      data: { codicon: 'wallet', label: 'DeepSeek余额', path: '/whale-balance' }
    })

    // 点击会话栏入口后的详情页
    ctx.register({
      id: 'whale-page',
      area: ROUTES_AREA,
      data: { path: '/whale-balance' },
      render: () => jsx(WhalePage, { rest: ctx.rest })
    })
  }
}
