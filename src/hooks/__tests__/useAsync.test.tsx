import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAsync } from '../useAsync'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsync', () => {
  it('ignores stale responses when deps change', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    let callCount = 0

    const { result, rerender } = renderHook(
      ({ value }) =>
        useAsync((_signal) => {
          callCount += 1
          return callCount === 1 ? first.promise : second.promise
        }, [value]),
      {
        initialProps: { value: 1 },
      }
    )

    await act(async () => {
      rerender({ value: 2 })
    })

    await act(async () => {
      second.resolve(2)
      await second.promise
    })

    expect(result.current.data).toBe(2)

    await act(async () => {
      first.resolve(1)
      await first.promise
    })

    expect(result.current.data).toBe(2)
  })

  it('aborts in-flight requests when deps change', async () => {
    const signals: AbortSignal[] = []
    const pending = deferred<number>()

    const { rerender } = renderHook(
      ({ value }) =>
        useAsync((signal) => {
          signals.push(signal)
          return pending.promise
        }, [value]),
      {
        initialProps: { value: 1 },
      }
    )

    await act(async () => {
      rerender({ value: 2 })
    })

    expect(signals[0].aborted).toBe(true)
  })
})
