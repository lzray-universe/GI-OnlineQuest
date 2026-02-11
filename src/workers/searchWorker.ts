import type { ManifestQuest } from '../types/quest'

type SearchRequest = {
  type: 'index'
  payload: ManifestQuest[]
}

type QueryRequest = {
  type: 'query'
  payload: { query: string }
}

let index: Array<{ id: number; text: string }> = []

const normalize = (value: string) => value.toLowerCase()

self.onmessage = (event: MessageEvent<SearchRequest | QueryRequest>) => {
  const { type, payload } = event.data
  if (type === 'index') {
    index = payload.map((quest) => ({
      id: quest.id,
      text: normalize(
        [
          quest.title,
          quest.description,
          quest.topSpeakers.map((speaker) => speaker.speakerName ?? '').join(' '),
        ].join(' ')
      ),
    }))
    self.postMessage({ type: 'indexed' })
    return
  }

  if (type === 'query') {
    const query = normalize(payload.query.trim())
    if (!query) {
      self.postMessage({ type: 'results', payload: [] })
      return
    }
    const results = index.filter((entry) => entry.text.includes(query)).map((entry) => entry.id)
    self.postMessage({ type: 'results', payload: results })
  }
}
