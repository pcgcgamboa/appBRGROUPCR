export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
