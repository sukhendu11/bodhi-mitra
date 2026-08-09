/**
 * EditorialHeader — shared centered editorial page header.
 *
 * Used by Books, Videos, and Reflections so every listing hub wears the
 * same header language: serif title, dot–gradient–dot saffron hairline,
 * and an optional description.
 */
export function EditorialHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="text-center max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight">
        {title}
      </h1>

      {/* Dot – gradient – dot saffron hairline */}
      <div className="mx-auto mt-6 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary/60" />
        <span
          aria-hidden="true"
          className="h-0.5 w-16 rounded-full bg-gradient-to-r from-saffron/70 to-saffron/20"
        />
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary/60" />
      </div>

      {description && (
        <p className="mt-6 max-w-xl mx-auto leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}
