import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    n: "01",
    title: "Choose a product",
    description: "Browse the Texvalley catalogue and pick a silhouette you love.",
  },
  {
    n: "02",
    title: "Upload your photo",
    description: "A single well-lit photo is all the mirror needs to begin.",
  },
  {
    n: "03",
    title: "Try it virtually",
    description: "See the garment placed on you with honest drape and fall.",
  },
  {
    n: "04",
    title: "Find your size",
    description: "Get a confident recommendation across Indian size charts.",
  },
  {
    n: "05",
    title: "Complete your look",
    description: "Pair it with accessories and layers styled for the occasion.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="border-y border-espresso-900/10 bg-ivory-100"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.24em] uppercase text-brass-600">
              How it works
            </p>
            <h2
              id="how-heading"
              className="mt-3 font-display text-3xl font-medium tracking-tight text-espresso-900 sm:text-4xl"
            >
              Five steps to the mirror
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-espresso-500">
            A calm, guided journey — no queues, no guesswork, no trial-room
            rush.
          </p>
        </div>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <li key={s.n}>
              <Card className="h-full">
                <CardContent>
                  <p
                    aria-hidden="true"
                    className="font-display text-4xl text-brass-500/70"
                  >
                    {s.n}
                  </p>
                  <h3 className="mt-3 text-[15px] font-semibold text-espresso-900">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-espresso-500">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
