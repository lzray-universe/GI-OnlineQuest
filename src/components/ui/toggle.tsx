import * as React from 'react'
import { cn } from '../../lib/utils'

export const Toggle = ({
  className,
  pressed,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) => (
  <button
    className={cn(
      'inline-flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium transition-colors',
      pressed ? 'bg-primary/15 text-primary' : 'bg-background text-foreground',
      className
    )}
    {...props}
  />
)
