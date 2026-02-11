import * as React from 'react'
import { cn } from '../../lib/utils'

export const Tabs = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('w-full', className)} {...props} />
)

export const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'inline-flex h-11 items-center gap-2 rounded-xl bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
)

export const TabsTrigger = ({
  className,
  active,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { active?: boolean }) => (
  <button
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
      active ? 'bg-background text-foreground shadow' : 'hover:bg-background/60',
      className
    )}
    {...props}
  />
)

export const TabsContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6', className)} {...props} />
)
