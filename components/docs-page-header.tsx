import { Balancer } from "react-wrap-balancer"

interface DocsPageHeaderProps {
  heading: string
  text?: string
}

export function DocsPageHeader({ heading, text }: DocsPageHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
        {heading}
      </h1>
      {text && (
        <p className="text-lg text-muted-foreground">
          <Balancer>{text}</Balancer>
        </p>
      )}
    </div>
  )
}
