'use client'

import { TrendingDownSolidIcon } from '@louez/ui/icons'

import { Badge } from '@louez/ui'

interface PricingBadgeProps {
  maxDiscount: number
  className?: string
  variant?: 'default' | 'compact'
}

export function PricingBadge({
  maxDiscount,
  className = '',
  variant = 'default',
}: PricingBadgeProps) {
  if (maxDiscount <= 0) return null

  if (variant === 'compact') {
    return (
      <Badge variant="progress" className={`text-xs font-medium ${className}`}>
        <TrendingDownSolidIcon className="h-3 w-3" />-{maxDiscount}%
      </Badge>
    )
  }

  return (
    <Badge variant="progress" className={`gap-1 ${className}`}>
      <TrendingDownSolidIcon className="h-3 w-3" />
      <span>Jusqu'à -{maxDiscount}%</span>
    </Badge>
  )
}
