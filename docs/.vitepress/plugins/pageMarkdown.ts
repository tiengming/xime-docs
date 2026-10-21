import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

export interface PageMarkdownOptions {
  /** 文档根目录，即 VitePress 的 srcDir */
  srcDir: string
  /** 相对 srcDir 需要跳过的目录（与 srcExclude 保持一致） */
  exclude?: string[]
}

/** 列出 srcDir 下所有需要对外暴露的 .md 文件（相对路径，posix 分隔符） */
function collectMarkdownFiles(
  dir: string,
  root: string,
  exclude: string[],
  result: string[] = []
): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue

    const abs = path.join(dir, entry.name)
    const rel = path.relative(root, abs).split(path.sep).join('/')
    if (exclude.some((item) => rel === item || rel.startsWith(`${item}/`))) continue

    if (entry.isDirectory()) {
      collectMarkdownFiles(abs, root, exclude, result)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(rel)
    }
  }
  return result
}

/**
 * 让每个页面都有一个同路径的 .md 版本：
 * - dev：直接读取源文件返回，改完 md 刷新即可看到最新内容
 * - build：把源 md 复制到产物目录，随站点一起部署
 *
 * 这样「复制本页 Markdown」按钮只需 fetch 同源的 /xxx.md，
 * 不依赖 GitHub raw（国内访问不稳定），也不会随页面渲染丢失原始格式。
 */
export function pageMarkdown({ srcDir, exclude = [] }: PageMarkdownOptions): Plugin {
  let outDir = ''
  let base = '/'
  let isSSRBuild = false
  let copied = false

  return {
    name: 'xime:page-markdown',

    configResolved(config) {
      // VitePress 会分别跑 client / SSR 两趟构建，只在 client 那趟的产物目录写 md
      isSSRBuild = Boolean(config.build.ssr)
      if (!isSSRBuild) {
        outDir = path.resolve(config.root, config.build.outDir)
      }
      base = config.base || '/'
    },

    configureServer(server) {
      // 在 VitePress 内部中间件之前拦截，避免 .md 被当成页面路由处理
      server.middlewares.use((req, res, next) => {
        if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) return next()

        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
        if (!pathname.endsWith('.md')) return next()

        const withoutBase =
          base !== '/' && pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname
        const rel = withoutBase.replace(/^\/+/, '')
        if (!rel) return next()

        const abs = path.resolve(srcDir, rel)
        // 防止 ../ 越界读取
        if (!abs.startsWith(srcDir + path.sep)) return next()
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return next()

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        if (req.method === 'HEAD') return res.end()
        res.end(fs.readFileSync(abs))
      })
    },

    closeBundle() {
      if (isSSRBuild || copied) return
      copied = true

      for (const rel of collectMarkdownFiles(srcDir, srcDir, exclude)) {
        const target = path.join(outDir, rel)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(path.join(srcDir, rel), target)
      }
    }
  }
}
