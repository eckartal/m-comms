export function toPlainText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map((entry) => toPlainText(entry)).filter(Boolean).join(' ').trim()
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('text' in record) return toPlainText(record.text)
    if ('content' in record) return toPlainText(record.content)
  }

  return ''
}

export function getContentTitle(title: unknown, fallback = 'Untitled'): string {
  const parsed = toPlainText(title).trim()
  return parsed || fallback
}

export function getBlockPreview(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  const firstBlock = blocks[0] as { content?: unknown } | undefined
  if (!firstBlock) return ''
  return toPlainText(firstBlock.content).trim()
}
