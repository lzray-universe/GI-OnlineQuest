export type DialogueLine = {
  nodeId: number
  roleType?: string
  speakerId?: number | null
  speakerName?: string | null
  text: string
}

export type BranchOption = {
  label: string
  lines: DialogueLine[]
}

export type BranchGroupSegment = {
  type: 'branch'
  options: BranchOption[]
  joinNodeId?: number
}

export type DialogueSegment = {
  type: 'line'
  line: DialogueLine
}

export type Segment = DialogueSegment | BranchGroupSegment

type TalkDialog = {
  nodeId: number
  roleType?: string
  speakerId?: number | null
  speakerName?: string | null
  text: string
  nextNodeIds?: number[]
}

type TalkData = {
  talkConfig?: {
    initDialog?: number
  }
  dialogs?: TalkDialog[]
}

const MAX_STEPS = 2000

const buildLine = (dialog: TalkDialog): DialogueLine => ({
  nodeId: dialog.nodeId,
  roleType: dialog.roleType,
  speakerId: dialog.speakerId,
  speakerName: dialog.speakerName,
  text: dialog.text,
})

const normalizeLabel = (value: string) => value.replace(/\s+/g, ' ').trim()

const getBranchLabel = (
  dialog: TalkDialog | undefined,
  index: number | undefined,
  fallbackLabel: (index: number) => string
) => {
  if (dialog?.text) {
    const trimmed = normalizeLabel(dialog.text)
    if (trimmed) {
      return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed
    }
  }
  return fallbackLabel(index ?? 0)
}

const tracePath = (startId: number, dialogMap: Map<number, TalkDialog>) => {
  const lines: DialogueLine[] = []
  const nodeIds: number[] = []
  const visited = new Set<number>()
  let currentId = startId
  let steps = 0

  while (currentId && steps < MAX_STEPS) {
    if (visited.has(currentId)) break
    const dialog = dialogMap.get(currentId)
    if (!dialog) break
    lines.push(buildLine(dialog))
    nodeIds.push(currentId)
    visited.add(currentId)
    steps += 1
    const nextIds = dialog.nextNodeIds ?? []
    if (nextIds.length !== 1) break
    currentId = nextIds[0]
  }

  return { lines, nodeIds }
}

const findJoinNode = (paths: Array<{ nodeIds: number[] }>) => {
  if (paths.length === 0) return undefined
  const sets = paths.map((path) => new Set(path.nodeIds))
  for (const nodeId of paths[0].nodeIds) {
    if (sets.every((set) => set.has(nodeId))) {
      return nodeId
    }
  }
  return undefined
}

export const buildTalkRenderSegments = (
  talk: TalkData,
  renderOptions?: { branchLabel?: (index: number) => string }
): Segment[] => {
  const dialogs = talk.dialogs ?? []
  if (dialogs.length === 0) return []

  const dialogMap = new Map(dialogs.map((dialog) => [dialog.nodeId, dialog]))
  const initDialog = talk.talkConfig?.initDialog ?? dialogs[0]?.nodeId
  if (!initDialog) return []

  const segments: Segment[] = []
  const visited = new Set<number>()
  let currentId: number | undefined = initDialog
  let steps = 0

  while (currentId && steps < MAX_STEPS) {
    if (visited.has(currentId)) break
    const dialog = dialogMap.get(currentId)
    if (!dialog) break
    segments.push({ type: 'line', line: buildLine(dialog) })
    visited.add(currentId)
    steps += 1

    const nextIds = dialog.nextNodeIds ?? []
    if (nextIds.length === 0) break
    if (nextIds.length === 1) {
      currentId = nextIds[0]
      continue
    }

    const branchPaths = nextIds.map((nextId) => tracePath(nextId, dialogMap))
    const joinNodeId = findJoinNode(branchPaths)

    const branchOptions = branchPaths.map((path, index) => {
      const joinIndex = joinNodeId ? path.nodeIds.indexOf(joinNodeId) : -1
      const lines =
        joinIndex >= 0 ? path.lines.slice(0, Math.max(joinIndex, 0)) : path.lines
      if (joinIndex >= 0) {
        path.nodeIds.slice(0, joinIndex).forEach((nodeId) => visited.add(nodeId))
      } else {
        path.nodeIds.forEach((nodeId) => visited.add(nodeId))
      }
      return {
        label: getBranchLabel(
          path.lines[0],
          index,
          renderOptions?.branchLabel ?? ((value) => `Branch ${value + 1}`)
        ),
        lines,
      }
    })

    segments.push({ type: 'branch', options: branchOptions, joinNodeId })

    if (!joinNodeId) {
      break
    }

    currentId = joinNodeId
  }

  return segments
}
