import * as React from "react"
import { Button, ButtonProps } from "./button"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface ResponsiveButtonProps extends ButtonProps {
  icon: React.ReactNode
  text?: string
  iconOnly?: boolean
}

const ResponsiveButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  ({ icon, text, iconOnly = false, className, children, ...props }, ref) => {
    const isMobile = useIsMobile()
    const showIconOnly = isMobile || iconOnly

    return (
      <Button
        ref={ref}
        className={cn(
          "flex items-center gap-1",
          showIconOnly && "gap-0 px-2",
          className
        )}
        {...props}
      >
        {icon}
        {!showIconOnly && (text || children)}
      </Button>
    )
  }
)

ResponsiveButton.displayName = "ResponsiveButton"

export { ResponsiveButton }