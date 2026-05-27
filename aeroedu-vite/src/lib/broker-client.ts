/**
 * Broker Client SDK — kết nối /api/broker WebSocket realtime.
 *
 * Usage:
 *   import { connectBroker } from '@/lib/broker-client'
 *
 *   const b = connectBroker({ token: getAuthToken() })
 *   b.subscribe(['user:alice', 'class:room-1'])
 *   const off = b.on('msg', (m) => console.log(m.topic, m.payload))
 *   b.publish('class:room-1', { kind: 'chat', text: 'hi' })
 *
 *   // Khi unmount:
 *   off()
 *   b.close()
 *
 * Đặc tính:
 *   - Auto-reconnect với exponential backoff (1s → 30s)
 *   - Re-subscribe topics sau khi reconnect
 *   - Local event emitter cho `msg`, `welcome`, `error`, `open`, `close`
 *   - Heartbeat ping mỗi 25s để giữ kết nối qua Cloud Run idle timeout (60s)
 */
import { useEffect, useRef } from 'react'

export interface BrokerMsg<T = unknown> {
  type: 'msg'
  topic: string
  payload: T
  ts: number
  from?: string
}

export interface BrokerEnvelope {
  type: string
  [key: string]: unknown
}

export type BrokerEvent =
  | 'msg'         // message received on subscribed topic
  | 'welcome'     // initial connection accepted
  | 'subscribed'  // server confirmed subscription
  | 'unsubscribed'
  | 'error'
  | 'open'        // socket connected
  | 'close'       // socket closed (will auto-retry)
  | 'reconnect'   // about to reconnect (delay ms)

type Listener = (data: BrokerEnvelope | { delay: number } | unknown) => void

export interface BrokerClient {
  subscribe: (topics: string[]) => void
  unsubscribe: (topics: string[]) => void
  publish: <T>(topic: string, payload: T) => void
  on: (event: BrokerEvent, fn: Listener) => () => void
  close: () => void
  isOpen: () => boolean
}

export interface BrokerOptions {
  url?: string        // override (default: derive from location)
  token: string
  path?: string       // default: /api/broker
  pingMs?: number     // default: 25_000
  maxBackoffMs?: number // default: 30_000
}

function defaultWsUrl(path: string, token: string): string {
  if (typeof window === 'undefined') return ''
  const loc = window.location
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  const qs = `?token=${encodeURIComponent(token)}`
  return `${proto}//${loc.host}${path}${qs}`
}

export function connectBroker(opts: BrokerOptions): BrokerClient {
  const path = opts.path || '/api/broker'
  const pingMs = opts.pingMs ?? 25_000
  const maxBackoff = opts.maxBackoffMs ?? 30_000

  const listeners: Record<string, Set<Listener>> = {}
  const subscribedTopics = new Set<string>()
  let ws: WebSocket | null = null
  let closed = false
  let backoff = 1000
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function emit(event: BrokerEvent, data: unknown) {
    const set = listeners[event]
    if (!set) return
    for (const fn of set) {
      try {
        fn(data as BrokerEnvelope)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[broker-client] listener err:', e)
      }
    }
  }

  function clearTimers() {
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = null
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function open() {
    if (closed) return
    const url = opts.url || defaultWsUrl(path, opts.token)
    try {
      ws = new WebSocket(url)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[broker-client] ws ctor err:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      backoff = 1000
      emit('open', null)
      // Re-subscribe nếu có topics đã lưu từ trước
      if (subscribedTopics.size > 0) {
        sendRaw({ type: 'subscribe', topics: Array.from(subscribedTopics) })
      }
      // Start heartbeat
      if (pingTimer) clearInterval(pingTimer)
      pingTimer = setInterval(() => {
        sendRaw({ type: 'ping' })
      }, pingMs)
    }

    ws.onmessage = (evt) => {
      let data: BrokerEnvelope | null = null
      try {
        data = JSON.parse(evt.data) as BrokerEnvelope
      } catch {
        return
      }
      if (!data || typeof data.type !== 'string') return
      // Emit specific event
      emit(data.type as BrokerEvent, data)
    }

    ws.onerror = () => {
      // onclose will follow → handle reconnect there
    }

    ws.onclose = () => {
      ws = null
      clearTimers()
      emit('close', null)
      if (!closed) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (closed || reconnectTimer) return
    const delay = backoff
    backoff = Math.min(backoff * 2, maxBackoff)
    emit('reconnect', { delay })
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      open()
    }, delay)
  }

  function sendRaw(obj: unknown): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    try {
      ws.send(JSON.stringify(obj))
      return true
    } catch {
      return false
    }
  }

  // Bootstrap
  open()

  return {
    subscribe(topics: string[]) {
      topics.forEach((t) => subscribedTopics.add(t))
      sendRaw({ type: 'subscribe', topics })
    },
    unsubscribe(topics: string[]) {
      topics.forEach((t) => subscribedTopics.delete(t))
      sendRaw({ type: 'unsubscribe', topics })
    },
    publish<T>(topic: string, payload: T) {
      sendRaw({ type: 'publish', topic, payload })
    },
    on(event: BrokerEvent, fn: Listener) {
      if (!listeners[event]) listeners[event] = new Set()
      listeners[event].add(fn)
      return () => {
        listeners[event]?.delete(fn)
      }
    },
    close() {
      closed = true
      clearTimers()
      try { ws?.close(1000, 'client close') } catch { /* noop */ }
      ws = null
    },
    isOpen() {
      return ws?.readyState === WebSocket.OPEN
    },
  }
}

/**
 * React hook helper — tự cleanup khi unmount.
 *
 * Usage:
 *   import { useBroker } from '@/lib/broker-client'
 *
 *   const b = useBroker(getToken(), ['class:abc'], {
 *     onMsg: (m) => console.log(m.topic, m.payload),
 *   })
 *   b.publish('class:abc', { ... })
 */
export function useBroker(
  token: string | null | undefined,
  topics: string[],
  handlers: {
    onMsg?: (m: BrokerMsg) => void
    onWelcome?: (m: BrokerEnvelope) => void
    onError?: (m: BrokerEnvelope) => void
    onOpen?: () => void
    onClose?: () => void
  } = {},
): { publish: BrokerClient['publish']; isOpen: () => boolean } {
  const clientRef = useRef<BrokerClient | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!token) return
    const b = connectBroker({ token })
    clientRef.current = b
    if (topics.length > 0) b.subscribe(topics)

    const offs: Array<() => void> = []
    offs.push(b.on('msg', (m) => handlersRef.current.onMsg?.(m as BrokerMsg)))
    offs.push(b.on('welcome', (m) => handlersRef.current.onWelcome?.(m as BrokerEnvelope)))
    offs.push(b.on('error', (m) => handlersRef.current.onError?.(m as BrokerEnvelope)))
    offs.push(b.on('open', () => handlersRef.current.onOpen?.()))
    offs.push(b.on('close', () => handlersRef.current.onClose?.()))

    return () => {
      offs.forEach((fn) => fn())
      b.close()
      clientRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, topics.join('|')])

  return {
    publish: (topic, payload) => clientRef.current?.publish(topic, payload),
    isOpen: () => clientRef.current?.isOpen() ?? false,
  }
}
