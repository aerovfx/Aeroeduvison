"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

interface CodeBlockWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CodeBlockWrapper({ children, className, ...props }: CodeBlockWrapperProps) {
  const [code, setCode] = React.useState<string>("")

  React.useEffect(() => {
    const codeElement = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === "code"
    ) as React.ReactElement | undefined

    if (codeElement) {
      setCode(codeElement.props.children as string)
    }
  }, [children])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between pb-3">
        <div className="h-4 w-4 rounded-full bg-red-500" />
        <div className="h-4 w-4 rounded-full bg-yellow-500" />
        <div className="h-4 w-4 rounded-full bg-green-500" />
        <CopyButton value={code} className="absolute right-4 top-4" />
      </div>
      {children}
    </div>
  )
}
