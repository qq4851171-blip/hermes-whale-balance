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
import { jsx, jsxs } from 'react/jsx-runtime'
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
    jsxs('span', {
      className: 'hermes-whale-pill',
      'data-peak': String(data.peak),
      role: 'button',
      tabIndex: 0,
      title: '点击刷新余额',
      onClick: () => setTick(t => t + 1)
    },
      jsx('span', { className: 'hermes-whale-ico', children: '🐋' }),
      label
    ) })
}

function WhalePage({ rest }) {
  const { data, isLoading } = useQuery({
    queryKey: [KEY[0], 'detail'],
    queryFn: () => rest('/balance'),
    refetchInterval: REFRESH_MS
  })
  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, maxWidth: 520 }
  if (isLoading || !data) return jsx('div', { style: card }, '🐋 余额加载中…')
  if (!data.ok) return jsx('div', { style: card }, `🐋 取数失败：${data.error || '未知'}`)
  const row = (k, v) => jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
    jsx('span', null, k), jsx('strong', null, v))
  return jsxs('div', { style: { padding: 20, display: 'grid', gap: 12 } },
    jsxs('div', { style: card },
      jsx('h2', { style: { margin: '0 0 8px' } }, '🐋 DeepSeek 余额'),
      row('可用余额', `¥${Number(data.total).toFixed(2)} ${data.currency}`),
      row('平台状态', data.available ? '可用' : '不可用'),
      row('今日已用（本地估算）', `$${data.today_usd}${data.today_cny_est != null ? ` ≈ ¥${data.today_cny_est}` : ''}`),
      row('峰谷状态', data.peak ? '高峰 · 全价' : '空闲 · 谷价'),
      row('更新时间', `${data.updated} CST`)
    ),
    jsx('div', { style: { color: 'var(--muted-foreground)', fontSize: 12 } },
      '余额＝DeepSeek 平台实时接口；今日已用＝admin state.db 本地估算。二者非同源，仅供对照。')
  )
}

export default {
  id: ID,
  name: 'Whale Balance',
  description: 'DeepSeek 余额常驻挂件：状态栏 pill + 会话栏明细入口',
  version: '1.0.0',
  defaultEnabled: false,
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
      data: { codicon: 'wallet', label: '余额明细', path: '/whale-balance' }
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
