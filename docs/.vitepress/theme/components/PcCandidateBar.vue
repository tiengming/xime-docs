<template>
  <div class="xcb" role="img" aria-label="曦码·曜候选栏预览">
    <div class="xcb-code">lwt<span class="xcb-caret"></span></div>
    <div class="xcb-bar">
      <span
        v-for="(c, i) in cands"
        :key="i"
        class="xcb-item"
        :class="{ 'xcb-item-active': i === 0 }"
      >
        <span class="xcb-num">{{ i + 1 }}.</span>
        <span class="xcb-word"
          >{{ c.a }}<span v-if="c.dim" class="xcb-dim">{{ c.dim }}</span></span
        >
        <sup class="xcb-hint" :class="{ 'xcb-hint-active': i === 0 }">{{ c.hint }}</sup>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 曦码·曜（Windows 桌面版）候选栏视觉稿，
 * 按 0.3.1 预览版候选栏截图 1:1 还原（lwt → 囹圄/轮船/囚徒/辋得/轮种）。
 */
interface Cand {
  a: string // 高亮主体
  dim?: string // 次字弱化（选中候选的第二字）
  hint: string // 次编码提示角标
}

const cands: Cand[] = [
  { a: '囹', dim: '圄', hint: 'd' },
  { a: '轮船', hint: '~e' },
  { a: '囚徒', hint: '~f' },
  { a: '辋得', hint: '~j' },
  { a: '轮种', hint: '~k' }
]
</script>

<style scoped>
.xcb {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

/* 顶部的已输入编码 */
.xcb-code {
  display: inline-flex;
  align-items: center;
  padding-left: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.6);
  animation: xcbIn 0.7s ease-out 0.15s both;
}

.xcb-caret {
  width: 2px;
  height: 14px;
  margin-left: 3px;
  background: rgba(168, 143, 240, 0.9);
  border-radius: 1px;
  animation: xcbCaret 1.1s steps(1) infinite;
}

/* 候选栏主体：深色玻璃条 */
.xcb-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 9px 16px;
  background: rgba(22, 22, 30, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow:
    0 14px 44px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(14px);
  animation: xcbIn 0.7s ease-out both;
}

.xcb-item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.25s ease;
}

/* 选中候选：品牌紫圆角胶囊 */
.xcb-item-active {
  padding: 6px 14px;
  background: linear-gradient(135deg, #8f73e2, #6d55d8);
  box-shadow: 0 4px 18px rgba(143, 115, 226, 0.45);
}

.xcb-num {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
}

.xcb-word {
  font-size: 16px;
  font-weight: 700;
  color: #f4f3f8;
}

/* 选中候选的次字弱化（截图中的「圄」） */
.xcb-dim {
  color: rgba(214, 203, 255, 0.78);
}

/* 次编码提示角标 */
.xcb-hint {
  margin-left: 1px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.42);
}

.xcb-hint-active {
  color: #a8c2ff;
}

@keyframes xcbIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes xcbCaret {
  0%,
  55% {
    opacity: 1;
  }
  56%,
  100% {
    opacity: 0;
  }
}

@media (max-width: 640px) {
  /* 窄屏：缩小字号与间距、隐藏次编码角标，保证五个候选完整可见 */
  .xcb-bar {
    justify-content: center;
    gap: 0;
    padding: 8px 8px;
    overflow: hidden;
  }
  .xcb-item {
    gap: 3px;
    padding: 5px 6px;
  }
  .xcb-item-active {
    padding: 5px 9px;
  }
  .xcb-num {
    font-size: 11px;
  }
  .xcb-word {
    font-size: 13.5px;
  }
  .xcb-hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xcb-code,
  .xcb-bar,
  .xcb-caret {
    animation: none;
  }
}
</style>
