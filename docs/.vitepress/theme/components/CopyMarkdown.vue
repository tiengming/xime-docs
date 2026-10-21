<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import { absolutizeMarkdown } from '../markdown-links'

type Status = 'idle' | 'copying' | 'copied' | 'error'

const RESET_DELAY = 2000

const props = withDefaults(
  defineProps<{
    /** nav：导航栏；inline：正文标题上方（用于导航栏放不下的中等屏幕） */
    placement?: 'nav' | 'inline'
  }>(),
  { placement: 'nav' }
)

const { page, frontmatter } = useData()

const status = ref<Status>('idle')
const menuOpen = ref(false)
const root = ref<HTMLElement | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | undefined

/** 自定义 layout 的页面（首页、FAQ、各类列表）正文由组件渲染，没有可复制的 md */
const visible = computed(() => {
  if (page.value.isNotFound) return false
  if (!page.value.relativePath?.endsWith('.md')) return false
  if (frontmatter.value.copyMarkdown === false) return false
  const layout = frontmatter.value.layout
  return !layout || layout === 'doc'
})

const markdownUrl = computed(() => withBase(`/${page.value.relativePath}`))
const downloadName = computed(() => page.value.relativePath.split('/').pop() || 'page.md')

const label = computed(() => {
  if (status.value === 'copying') return '复制中…'
  if (status.value === 'copied') return '已复制'
  if (status.value === 'error') return '复制失败'
  return '复制 MD'
})

const hint = computed(() =>
  status.value === 'error' ? '复制失败，请重试' : '复制本页 Markdown，可直接粘贴给 AI'
)

/** 去掉 YAML frontmatter：frontmatter 是给构建器看的，对 AI 没有意义 */
function stripFrontmatter(source: string): string {
  return source
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '')
    .replace(/^\s+/, '')
}

/** 当前页的干净地址：去掉 .html / index.html，与站内导航一致 */
function cleanPageUrl(): string {
  const path = window.location.pathname
    .replace(/\/index\.html?$/, '/')
    .replace(/\.html?$/, '')
  return `${window.location.origin}${path}`
}

/** 页面实际渲染出的图片地址（VitePress 会把相对图片编译成带 hash 的 /assets/） */
function collectRenderedImages(): string[] {
  return Array.from(document.querySelectorAll<HTMLImageElement>('.vp-doc img'))
    .map((img) => img.currentSrc || img.src)
    .filter(Boolean)
}

/** 复制/下载共用的 Markdown 正文：补全绝对 URL */
function buildBody(source: string): string {
  // 仓库里的 md 是 CRLF，统一成 LF 更干净
  const body = stripFrontmatter(source).replace(/\r\n/g, '\n')
  return absolutizeMarkdown(body, {
    origin: window.location.origin,
    pageRelativePath: page.value.relativePath,
    pageUrl: cleanPageUrl(),
    base: withBase('/'),
    imageUrls: collectRenderedImages()
  })
}

/** 正文前补一行来源，方便 AI 回答时引用出处 */
function buildPayload(source: string): string {
  return `> 来源：${cleanPageUrl()}\n\n${buildBody(source)}`
}

async function fetchMarkdown(): Promise<string> {
  const res = await fetch(encodeURI(markdownUrl.value), { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  // dev server 未产出 md 时可能返回 HTML 页面，避免把整页 HTML 贴给 AI
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('unexpected HTML response')
  return text
}

async function writeClipboard(text: string) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 权限被拒时走兜底方案
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  const ok = document.execCommand('copy')
  textarea.remove()
  if (!ok) throw new Error('execCommand("copy") failed')
}

function flash(next: Status) {
  status.value = next
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    status.value = 'idle'
  }, RESET_DELAY)
}

async function copyMarkdown() {
  if (status.value === 'copying') return

  menuOpen.value = false
  status.value = 'copying'

  try {
    const text = await fetchMarkdown()
    await writeClipboard(buildPayload(text))
    flash('copied')
  } catch (error) {
    console.error('[copy-markdown]', error)
    flash('error')
  }
}

/** 下载与复制使用同一份补全过 URL 的内容 */
async function downloadMarkdown(event: MouseEvent) {
  event.preventDefault()
  menuOpen.value = false

  try {
    const source = await fetchMarkdown()
    const blob = new Blob([buildBody(source)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName.value
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('[copy-markdown]', error)
    // 兜底：仍允许下载原始 md
    window.location.href = markdownUrl.value
  }
}

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  if (!visible.value) return
  menuOpen.value = !menuOpen.value
}

function onPointerDown(event: PointerEvent) {
  if (!menuOpen.value) return
  if (root.value && !root.value.contains(event.target as Node)) closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(resetTimer)
})

watch(() => page.value.relativePath, closeMenu)
</script>

<template>
  <div
    v-if="visible"
    ref="root"
    class="x-md"
    :class="placement === 'inline' ? 'x-md--inline' : 'x-md--nav'"
    :data-status="status"
  >
    <button
      class="x-md-main"
      type="button"
      :title="hint"
      :aria-label="hint"
      :disabled="status === 'copying'"
      @click="copyMarkdown"
    >
      <svg
        v-if="status === 'copied'"
        class="x-md-icon"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M3.5 8.5l3 3 6-6.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg
        v-else-if="status === 'error'"
        class="x-md-icon"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" />
        <path
          d="M8 4.8v4.1M8 11.2v.1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else class="x-md-icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect
          x="5.2"
          y="2.2"
          width="7.6"
          height="9.4"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
        />
        <path
          d="M10.6 13.8H4.9a1.7 1.7 0 0 1-1.7-1.7V5.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
        />
      </svg>
      <span class="x-md-label">{{ label }}</span>
    </button>

    <button
      class="x-md-caret"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      aria-label="更多 Markdown 操作"
      @click="toggleMenu"
    >
      <svg class="x-md-chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M4 6.2L8 10l4-3.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="menuOpen" class="x-md-menu" role="menu">
      <a
        class="x-md-item"
        role="menuitem"
        :href="markdownUrl"
        target="_blank"
        rel="noreferrer"
        @click="closeMenu"
      >
        <svg class="x-md-item-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M4.2 1.8h4.3l3.3 3.4v9H4.2z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
          <path d="M8.4 2v3.4h3.3" fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
        查看 Markdown 原文
      </a>
      <a
        class="x-md-item"
        role="menuitem"
        :href="markdownUrl"
        :download="downloadName"
        @click="downloadMarkdown"
      >
        <svg class="x-md-item-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 2.2v7.1m0 0L5.2 6.5M8 9.3l2.8-2.8M3.2 11.2v1.5c0 .7.5 1.2 1.2 1.2h7.2c.7 0 1.2-.5 1.2-1.2v-1.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        下载 .md 文件
      </a>
    </div>
  </div>
</template>

<style scoped>
.x-md {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  height: 32px;
  margin-left: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

/*
 * 响应式摆放：
 * - <768px：导航栏图标（移动端菜单空间充足）
 * - 768–1359px：VitePress 会展示完整导航菜单，顶部空间不足（实测导航内容
 *   在 1360px 以下会溢出并被裁掉），按钮改放正文标题上方、右对齐
 * - ≥1360px：导航栏图标 + 文字
 */
.x-md--inline {
  display: none;
  width: fit-content;
  margin: 0 0 10px auto;
}

@media (min-width: 768px) and (max-width: 1359px) {
  .x-md--inline {
    display: flex;
  }

  .x-md--nav {
    display: none;
  }
}

.x-md:hover {
  border-color: var(--vp-c-brand-2);
}

.x-md-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 10px;
  border: 0;
  border-radius: 9px 0 0 9px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.x-md-main:hover:not(:disabled) {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.x-md-main:disabled {
  cursor: progress;
}

.x-md[data-status='copied'] .x-md-main {
  color: #16a34a;
}

.x-md[data-status='error'] .x-md-main {
  color: #dc2626;
}

.x-md-icon {
  width: 15px;
  height: 15px;
  flex: none;
}

.x-md-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--vp-c-divider);
  border-radius: 0 9px 9px 0;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.x-md-caret:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.x-md-chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.x-md-caret[aria-expanded='true'] .x-md-chevron {
  transform: rotate(180deg);
}

.x-md-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-el);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
}

.x-md-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.x-md-item:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.x-md-item-icon {
  width: 15px;
  height: 15px;
  flex: none;
  opacity: 0.8;
}

.x-md-main:focus-visible,
.x-md-caret:focus-visible,
.x-md-item:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

@media (max-width: 640px) {
  .x-md {
    margin-left: 8px;
  }

  .x-md-label {
    display: none;
  }

  .x-md-main {
    padding: 0 8px;
  }
}
</style>
