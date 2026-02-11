export type SrtEntry = {
  id: number
  start: string
  end: string
  text: string
}

export const parseSrt = (content: string): SrtEntry[] => {
  const blocks = content.replace(/\r/g, '').trim().split(/\n\n+/)
  const entries: SrtEntry[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 2) continue
    const id = Number(lines[0])
    const timeLine = lines[1]
    const [start, end] = timeLine.split(' --> ')
    const text = lines.slice(2).join('\n')
    if (!start || !end) continue
    entries.push({ id: Number.isNaN(id) ? entries.length + 1 : id, start, end, text })
  }
  return entries
}
