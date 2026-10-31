<template>
  <div class="plat-tabs">
    <div class="plat-tabs-bar" role="tablist">
      <button
        v-for="(label, i) in labels"
        :key="label"
        type="button"
        role="tab"
        :aria-selected="i === active"
        :class="{ 'plat-tab-active': i === active }"
        class="plat-tab"
        @click="active = i"
      >
        {{ label }}<span v-if="badges?.[i]" class="plat-tab-badge">{{ badges[i] }}</span>
      </button>
    </div>
    <div
      v-for="(label, i) in labels"
      v-show="i === active"
      :key="`panel-${label}`"
      class="plat-tab-panel"
      role="tabpanel"
    >
      <slot :name="`tab${i}`" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * 平台差异 Tabs：桌面版（Windows / Linux / macOS）与手机版（Android / HarmonyOS）
 * 共用一份文档，操作差异写进对应 tab。
 * 用法（markdown 中直接使用，槽位按序号命名）：
 * <PlatTabs :labels="['Windows', 'Linux', 'macOS']">
 *   <template #tab0>Windows 专属步骤</template>
 *   <template #tab1>Linux：即将支持</template>
 * </PlatTabs>
 */
const props = defineProps<{
  /** 平台标签，按顺序对应 #tab0 / #tab1 / ... 槽位 */
  labels: string[]
  /** 可选角标（如「Beta」「即将支持」），与 labels 一一对应 */
  badges?: string[]
}>()

const active = ref(0)
</script>
