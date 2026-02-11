import { cn } from '../lib/utils'

type TokenMeta = {
  index: number
  text: string
}

type Token = {
  text: string
  clickable: boolean
}

const isCjk = (value: string) => /[\u4e00-\u9fff]/.test(value)

const tokenize = (text: string, lang: string, mode: 'word' | 'char') => {
  const tokens: Token[] = []
  let index = 0
  while (index < text.length) {
    const slice = text.slice(index)
    if (lang === 'en') {
      const match = slice.match(/^[A-Za-z']+/)
      if (match) {
        tokens.push({ text: match[0], clickable: true })
        index += match[0].length
        continue
      }
    } else if (lang === 'ja') {
      const match = slice.match(/^[\u3040-\u30ff\u31f0-\u31ff\u3400-\u9fff]+/)
      if (match) {
        tokens.push({ text: match[0], clickable: true })
        index += match[0].length
        continue
      }
    } else if (lang === 'zh') {
      if (mode === 'char' && isCjk(slice[0])) {
        tokens.push({ text: slice[0], clickable: true })
        index += 1
        continue
      }
      const match = slice.match(/^[\u4e00-\u9fff]+/)
      if (match) {
        tokens.push({ text: match[0], clickable: true })
        index += match[0].length
        continue
      }
    }
    tokens.push({ text: slice[0], clickable: false })
    index += 1
  }
  return tokens
}

export const ClickableText = ({
  text,
  lang,
  onClickToken,
  mode = 'word',
  className,
}: {
  text: string
  lang: string
  onClickToken: (term: string, meta: TokenMeta) => void
  mode?: 'word' | 'char'
  className?: string
}) => {
  const tokens = tokenize(text, lang, mode)
  let offset = 0
  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {tokens.map((token, index) => {
        const startIndex = offset
        offset += token.text.length
        if (!token.clickable) {
          return <span key={`${index}-${startIndex}`}>{token.text}</span>
        }
        return (
          <button
            key={`${index}-${startIndex}`}
            type="button"
            className="inline rounded-sm text-left text-primary underline-offset-2 hover:underline"
            onClick={() => onClickToken(token.text, { index: startIndex, text })}
          >
            {token.text}
          </button>
        )
      })}
    </span>
  )
}
