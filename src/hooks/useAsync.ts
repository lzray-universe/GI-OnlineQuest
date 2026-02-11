import { useEffect, useRef, useState } from 'react'

type UseAsyncOptions = {
  /**
   * Keep previous data while loading new deps.
   * Defaults to false to avoid rendering stale data after dependency changes.
   */
  keepPreviousData?: boolean
}

export const useAsync = <T>(
  factory: (signal: AbortSignal) => Promise<T>,
  deps: any[] = [],
  options: UseAsyncOptions = {},
) => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const { keepPreviousData = false } = options
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()

    let active = true
    setLoading(true)
    setError(null)
    if (!keepPreviousData) {
      setData(null)
    }

    factory(controller.signal)
      .then((result) => {
        if (active && requestIdRef.current === requestId) {
          setData(result)
        }
      })
      .catch((err) => {
        if (active && requestIdRef.current === requestId) {
          if ((err as Error).name !== 'AbortError') {
            setError(err as Error)
          }
        }
      })
      .finally(() => {
        if (active && requestIdRef.current === requestId) {
          setLoading(false)
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [...deps, options.keepPreviousData])

  return { data, error, loading }
}
