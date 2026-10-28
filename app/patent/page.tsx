import { Suspense } from "react";
import { PatentWorkbench } from "@/components/patent/workbench/patent-workbench";

export default function PatentPage() {
  return (
    <Suspense fallback={<div className="h-full bg-white" />}>
      <PatentWorkbench />
    </Suspense>
  );
}
