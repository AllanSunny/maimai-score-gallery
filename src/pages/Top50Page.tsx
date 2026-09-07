import { PageHeading } from "../components/ui/PageHeading";
import { EmptyState } from "../components/ui/EmptyState";

export function Top50Page() {
  return (
    <div>
      <PageHeading
        title="Best 50 charts"
        description="This page will showcase the charts that make up my current B50, split into new and old chart pools."
      />
      <EmptyState className="mt-12 rounded-2xl border border-dashed border-line !px-6 !py-16 text-sm">
        B50 data and layout coming soon.
      </EmptyState>
    </div>
  );
}
