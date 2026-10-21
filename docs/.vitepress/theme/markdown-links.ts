export interface AbsolutizeOptions {
  /** 当前站点源，例如 https://ximei.me（复制时取 window.location.origin） */
  origin: string
  /** 当前页相对源目录的路径，例如 features/clipboard.md */
  pageRelativePath: string
  /** 当前页的干净地址（不带 .html），用于纯锚点链接，例如 https://ximei.me/usage */
  pageUrl: string
  /** 站点 base，默认 / */
  base?: string
  /**
   * 页面实际渲染出的图片地址（按文档顺序）。
   * VitePress 会把相对图片编译成带 hash 的 /assets/xxx，源文件路径在产物里不存在，
   * 因此优先使用渲染后的地址。
   */
  imageUrls?: string[]
}

interface Destination {
  start: number
  end: number
  raw: string
  kind: 'link' | 'image'
  resolved?: string
}

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

function splitTarget(raw: string): { path: string; suffix: string } {
  const index = raw.search(/[?#]/)
  if (index === -1) return { path: raw, suffix: '' }
  return { path: raw.slice(0, index), suffix: raw.slice(index) }
}

function normalizePath(path: string): string {
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return `/${segments.join('/')}`
}

function hasExtension(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return /\.[^./]+$/.test(name)
}

function resolveDestination(dest: string, options: AbsolutizeOptions): string {
  const value = dest.trim()
  if (!value) return dest

  // 页内锚点：复制出去后没有页面上下文，补上当前页地址
  if (value.startsWith('#')) return options.pageUrl + value

  // 外链、mailto:、data:、协议相对地址保持原样
  if (value.startsWith('//') || SCHEME_RE.test(value)) return value

  const { path, suffix } = splitTarget(value)
  const trailingSlash = path.length > 1 && path.endsWith('/')
  let resolved: string

  // 只有查询串（如 ?from=ai）时指向当前页
  if (!path) return options.pageUrl + suffix

  if (path.startsWith('/')) {
    resolved = normalizePath(path)
  } else {
    const dir = `/${options.pageRelativePath.replace(/[^/]*$/, '')}`
    resolved = normalizePath(dir + path)
  }

  if (trailingSlash) resolved += '/'

  // docs/public 下的文件会发布到站点根目录
  resolved = resolved.replace(/^\/public\//, '/')

  // 站内页面：.md -> .html；无扩展名按 cleanUrls: false 补 .html
  if (/\.md$/i.test(resolved)) {
    resolved = resolved.replace(/\.md$/i, '.html')
  } else if (!hasExtension(resolved) && !resolved.endsWith('/')) {
    resolved += '.html'
  }

  const base = (options.base || '/').replace(/\/$/, '')
  return options.origin + base + resolved + suffix
}

/** 找出所有链接/图片目标，跳过围栏代码块和行内代码 */
function collectDestinations(source: string): Destination[] {
  const destinations: Destination[] = []
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0
  let offset = 0

  while (offset <= source.length) {
    const newline = source.indexOf('\n', offset)
    const lineEnd = newline === -1 ? source.length : newline
    const line = source.slice(offset, lineEnd)

    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      const marker = fence[1][0]
      const length = fence[1].length
      if (!inFence) {
        inFence = true
        fenceChar = marker
        fenceLength = length
      } else if (marker === fenceChar && length >= fenceLength) {
        inFence = false
      }
      if (newline === -1) break
      offset = newline + 1
      continue
    }

    if (inFence) {
      if (newline === -1) break
      offset = newline + 1
      continue
    }

    // 引用式链接定义：[id]: /path
    const definition = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/.exec(line)
    if (definition) {
      const raw = definition[1]
      const start = offset + definition[0].indexOf(raw)
      destinations.push({ start, end: start + raw.length, raw, kind: 'link' })
    }

    // 行内代码范围，避免改写 `[x](/y)` 这类示例
    const codeRanges: Array<[number, number]> = []
    const codeRe = /(`+)[\s\S]*?\1/g
    let code: RegExpExecArray | null
    while ((code = codeRe.exec(line))) {
      codeRanges.push([code.index, code.index + code[0].length])
    }
    const inCode = (index: number) =>
      codeRanges.some(([start, end]) => index >= start && index < end)

    let cursor = line.indexOf('](')
    while (cursor !== -1) {
      if (!inCode(cursor)) {
        // 图片标记在标签开头：![alt](...)，不能只看 ]( 前一个字符
        const isImage = /!\[[^\]]*\]$/.test(line.slice(0, cursor + 1))
        let start = cursor + 2
        while (start < line.length && /\s/.test(line[start])) start++

        let end = -1
        let raw = ''

        if (line[start] === '<') {
          const close = line.indexOf('>', start + 1)
          if (close !== -1) {
            start += 1
            end = close
            raw = line.slice(start, end)
          }
        } else {
          let depth = 0
          let index = start
          while (index < line.length) {
            const char = line[index]
            if (char === '(') depth++
            else if (char === ')') {
              if (depth === 0) break
              depth--
            } else if (depth === 0 && /\s/.test(char)) {
              break
            }
            index++
          }
          end = index
          raw = line.slice(start, end)
        }

        if (end > start && raw) {
          destinations.push({
            start: offset + start,
            end: offset + end,
            raw,
            kind: isImage ? 'image' : 'link'
          })
        }
      }

      cursor = line.indexOf('](', cursor + 2)
    }

    if (newline === -1) break
    offset = newline + 1
  }

  return destinations
}

/**
 * 把 Markdown 里的相对地址补成绝对地址，保证复制/下载后离开站点仍可访问。
 * 不改变外链、代码块和行内代码。
 */
export function absolutizeMarkdown(source: string, options: AbsolutizeOptions): string {
  const destinations = collectDestinations(source)

  const images = destinations.filter((item) => item.kind === 'image')
  const renderedImages =
    options.imageUrls && options.imageUrls.length === images.length ? options.imageUrls : null

  let imageIndex = 0
  for (const item of destinations) {
    if (item.kind === 'image' && renderedImages) {
      item.resolved = renderedImages[imageIndex++] || resolveDestination(item.raw, options)
    } else {
      item.resolved = resolveDestination(item.raw, options)
    }
  }

  let result = source
  for (let index = destinations.length - 1; index >= 0; index--) {
    const item = destinations[index]
    if (!item.resolved || item.resolved === item.raw) continue
    result = result.slice(0, item.start) + item.resolved + result.slice(item.end)
  }
  return result
}
