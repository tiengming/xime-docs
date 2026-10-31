<template>
  <div class="x-home">

    <!-- ===== Hero ===== -->
    <section class="x-hero">
      <div class="x-hero-bg" aria-hidden="true">
        <div class="x-blob x-blob-1"></div>
        <div class="x-blob x-blob-2"></div>
        <div class="x-blob x-blob-3"></div>
        <div class="x-grid-overlay"></div>
        <div class="x-keys">
          <span
            v-for="k in keys"
            :key="k.id"
            class="x-key"
            :style="{
              left: k.left,
              width: k.size,
              height: k.size,
              fontSize: k.font,
              animationDuration: k.dur,
              animationDelay: k.delay,
              '--o': k.opacity,
              '--r0': k.r0,
              '--r1': k.r1
            }"
          >{{ k.label }}</span>
        </div>
      </div>

      <div class="x-hero-inner">
        <!-- 左侧文字 -->
        <div class="x-hero-text">
          <div class="x-hero-badge">
            <span class="x-pulse-dot"></span>
            早期预览版（Beta）· 请勿用于生产环境
          </div>
          <div class="x-hero-eyebrow">XIME YAO · DESKTOP</div>
          <h1 class="x-hero-title">
            <span class="x-title-shine">曦码·曜</span><span class="x-beta-chip">BETA</span>
          </h1>
          <p class="x-hero-typing">
            支持<span class="x-type-word">{{ typed }}</span><span class="x-caret"></span>
          </p>
          <p class="x-hero-desc">
            Xime 桌面版，Rust 实现并与系统输入法框架深度集成。
            Windows 目前处于 <strong>Beta 预览阶段</strong>：功能尚不完整、稳定性不作保证，仅建议尝鲜测试，请勿作为主力输入法或用于生产环境。Linux 与 macOS 即将到来。
          </p>
          <div class="x-hero-actions">
            <a href="https://github.com/ximeiorg/XimeYao/releases" class="x-btn x-btn-primary" target="_blank">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              下载 Windows 版
            </a>
            <a href="/pc/usage" class="x-btn x-btn-glass">桌面版文档</a>
            <a href="https://github.com/ximeiorg" class="x-btn x-btn-glass" target="_blank">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17.3 5 18.3 5.3 18.3 5.3c.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3"/></svg>
              GitHub
            </a>
          </div>
        </div>

        <!-- 右侧：桌面候选栏视觉稿（PcCandidateBar 按 0.3.1 预览版截图还原） -->
        <div class="x-hero-visual" ref="visualRef" @mousemove="onTilt" @mouseleave="resetTilt">
          <div class="x-phone-halo"></div>
          <div class="x-pc-shot" :style="tiltStyle">
            <PcCandidateBar />
          </div>
        </div>
      </div>

      <div class="x-scroll-hint" aria-hidden="true"><span></span></div>
    </section>

    <!-- ===== 平台支持 ===== -->
    <section class="x-platforms" id="平台支持" ref="platformsRef">
      <div class="x-section-head">
        <div class="x-section-label">平台支持</div>
        <h2 class="x-section-title">三大桌面平台</h2>
        <p class="x-section-desc">Windows 处于 Beta 预览阶段，Linux 与 macOS 即将到来</p>
      </div>

      <div class="x-plat-grid">
        <a
          v-for="(p, i) in platforms"
          :key="i"
          :href="p.link"
          :target="p.external ? '_blank' : undefined"
          class="x-glass-card x-plat-card"
          :class="{ 'x-plat-soon': p.soon }"
          :style="{ '--i': i }"
          @mousemove="spotlightMove"
        >
          <div class="x-plat-head">
            <span class="x-plat-logo">{{ p.logo }}</span>
            <span class="x-plat-status" :class="statusClass(p)">{{ statusText(p) }}</span>
          </div>
          <h3>{{ p.name }}</h3>
          <p>{{ p.desc }}</p>
          <span v-if="!p.soon" class="x-plat-go">查看文档 →</span>
        </a>
      </div>
    </section>

    <!-- ===== 功能特色 ===== -->
    <section class="x-features" ref="featuresRef">
      <div class="x-section-head">
        <div class="x-section-label">功能特色</div>
        <h2 class="x-section-title">桌面级输入体验</h2>
        <p class="x-section-desc">系统级集成，与手机版同一套 Rime 生态</p>
      </div>

      <div class="x-features-grid">
        <div
          v-for="(f, i) in features"
          :key="i"
          class="x-glass-card x-feature-card"
          :style="{ '--i': i }"
          ref="featureCards"
          @mousemove="spotlightMove"
        >
          <div class="x-feature-icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.details }}</p>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="x-cta" ref="ctaRef">
      <div class="x-cta-card">
        <div class="x-cta-glow"></div>
        <h2 class="x-cta-title">想在 Windows 上尝鲜吗？</h2>
        <p class="x-cta-desc">当前为 Beta 预览版（0.3.1），官方明确「请勿用于生产环境」；尝鲜前请先备份 %APPDATA%\xime</p>
        <div class="x-cta-actions">
          <a href="https://github.com/ximeiorg/XimeYao/releases" class="x-btn x-btn-primary" target="_blank">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            下载预览版
          </a>
          <a href="/pc/usage" class="x-btn x-btn-glass">阅读桌面版文档</a>
          <a href="/pc/faq" class="x-btn x-btn-glass">常见问题</a>
        </div>
      </div>
    </section>

    <!-- footer 间距 -->
    <div class="x-footer-gap"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useImmersivePage, spotlightMove } from '../immersive'
import PcCandidateBar from './PcCandidateBar.vue'

useImmersivePage()

const platforms = [
  {
    name: 'Windows',
    logo: '🪟',
    soon: false,
    beta: true,
    external: false,
    link: '/pc/usage',
    desc: '早期预览：功能尚不完整，尝鲜前请先备份 %APPDATA%\\xime。Rust + TSF 实现，MSI / MSIX 安装，Win 10/11 x64'
  },
  {
    name: 'Linux',
    logo: '🐧',
    soon: true,
    external: false,
    link: '/pc/#平台支持',
    desc: '规划中，敬请期待'
  },
  {
    name: 'macOS',
    logo: '🍎',
    soon: true,
    external: false,
    link: '/pc/#平台支持',
    desc: '规划中，敬请期待'
  }
]

function statusText(p: (typeof platforms)[number]) {
  if (p.soon) return '即将支持'
  if (p.beta) return 'Beta 预览 · 勿用于生产'
  return '稳定版可用'
}
function statusClass(p: (typeof platforms)[number]) {
  if (p.soon) return 'x-plat-status-soon'
  if (p.beta) return 'x-plat-status-beta'
  return 'x-plat-status-ok'
}

const features = [
  { icon: '🪟', title: 'TSF 系统级集成', details: 'Rust + TSF 实现，安装即注册输入法；托盘菜单直达中英切换、方案开关与用户资料同步' },
  { icon: '⌨️', title: 'Rime 生态通用', details: '与 Android 版共用 librime 内核，方案与词典格式通用，扩展商店直接下载方案、模型、插件' },
  { icon: '🧮', title: '= 前缀计算器', details: '中文状态下按 = 进入计算器，候选栏实时显示结果，方向键切换、鼠标点选上屏' },
  { icon: '🎙️', title: '本地语音识别', details: '本地模型离线可用；GPU 版可借 CUDA 加速，缺运行库时自动回退 CPU，不影响打字' },
  { icon: '📋', title: '剪贴板与快捷发送', details: '候选栏面板直达剪切板 / 快捷发送 / 表情 / 符号 / 语音，历史记录与收藏一应俱全' },
  { icon: '🧩', title: '插件与备份', details: '插件与 Android 版通用，支持 WebDAV 备份恢复与用户词典同步，换机迁移复制数据目录即可' }
]

// ---- 打字机轮播 ----
const words = ['五笔 86', '五笔拼音混输', '= 前缀计算器', '本地语音识别', '插件生态']
const typed = ref('')
let typeTimer: ReturnType<typeof setTimeout> | null = null

function typeLoop() {
  let wi = 0, ci = 0, deleting = false
  const step = () => {
    const w = words[wi]
    if (!deleting) {
      ci++
      typed.value = w.slice(0, ci)
      if (ci === w.length) {
        deleting = true
        typeTimer = setTimeout(step, 1800)
        return
      }
      typeTimer = setTimeout(step, 140)
    } else {
      ci--
      typed.value = w.slice(0, ci)
      if (ci === 0) {
        deleting = false
        wi = (wi + 1) % words.length
        typeTimer = setTimeout(step, 400)
        return
      }
      typeTimer = setTimeout(step, 60)
    }
  }
  step()
}

// ---- 飘浮按键粒子（客户端生成，避免 SSR 不一致） ----
interface FloatKey { id: number; label: string; left: string; size: string; font: string; dur: string; delay: string; opacity: string; r0: string; r1: string }
const keys = ref<FloatKey[]>([])
const keyLabels = ['曜', 'W', 'Y', 'A', 'O', 'U', '码', 'R', '码', 'T', '字', 'I', '根', 'V', 'S', '词']

function genKeys(): FloatKey[] {
  return keyLabels.map((label, i) => {
    const size = 30 + Math.random() * 34
    return {
      id: i,
      label,
      left: `${4 + Math.random() * 92}%`,
      size: `${size.toFixed(0)}px`,
      font: `${(size * 0.4).toFixed(0)}px`,
      dur: `${14 + Math.random() * 16}s`,
      delay: `${-Math.random() * 20}s`,
      opacity: (0.14 + Math.random() * 0.22).toFixed(2),
      r0: `${(Math.random() * 24 - 12).toFixed(0)}deg`,
      r1: `${(Math.random() * 40 - 20).toFixed(0)}deg`
    }
  })
}

// ---- 视觉稿 3D 视差 ----
const tilt = reactive({ rx: 0, ry: 0 })
const tiltStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
}))
function onTilt(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  tilt.ry = ((e.clientX - r.left) / r.width - 0.5) * 14
  tilt.rx = -((e.clientY - r.top) / r.height - 0.5) * 10
}
function resetTilt() {
  tilt.rx = 0
  tilt.ry = 0
}

const platformsRef = ref<HTMLElement | null>(null)
const featuresRef = ref<HTMLElement | null>(null)
const ctaRef = ref<HTMLElement | null>(null)

let sectionObserver: IntersectionObserver | null = null
let cardObserver: IntersectionObserver | null = null

onMounted(() => {
  keys.value = genKeys()
  typeLoop()

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('x-visible')
          sectionObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )

  if (platformsRef.value) sectionObserver.observe(platformsRef.value)
  if (featuresRef.value) sectionObserver.observe(featuresRef.value)
  if (ctaRef.value) sectionObserver.observe(ctaRef.value)

  cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('x-card-visible')
          cardObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.x-plat-card, .x-feature-card').forEach((el) => {
    cardObserver?.observe(el)
  })
})

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
  sectionObserver?.disconnect()
  cardObserver?.disconnect()
})
</script>
