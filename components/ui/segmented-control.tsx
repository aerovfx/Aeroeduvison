import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cn } from "@/lib/utils"

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg bg-gray-100 p-1",
      className
    )}
    {...props}
  />
))
SegmentedControl.displayName = ToggleGroupPrimitive.Root.displayName

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "px-4 py-2 text-sm font-medium text-gray-700 rounded-md transition-colors hover:bg-gray-200 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm",
      className
    )}
    {...props}
  />
))
SegmentedControlItem.displayName = ToggleGroupPrimitive.Item.displayName

export { SegmentedControl, SegmentedControlItem }
