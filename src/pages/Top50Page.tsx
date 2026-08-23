import { PageHeading } from "../components/ui/PageHeading";

export function Top50Page() {
  return (
    <div>
      <PageHeading
        eyebrow="Top 50"
        title="Best 50 charts"
        description="This page will showcase the charts that make up my current B50, split into new and old chart pools."
      />
      <div className="mt-12 rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-lightest">
        B50 data and layout coming soon.
      </div>
    </div>
  );
}
