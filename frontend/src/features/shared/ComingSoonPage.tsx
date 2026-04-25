type ComingSoonPageProps = {
  title: string;
  description: string;
};

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <section className="panel max-w-3xl p-6 md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Refactor en cours</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
    </section>
  );
}
