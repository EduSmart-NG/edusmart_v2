import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      {/* Page Header Skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-96" /> {/* Title */}
        <Skeleton className="h-5 w-64" /> {/* Subtitle */}
      </div>

      {/* Form Card Skeleton */}
      <Card className="px-4 md:px-8 py-6">
        <div className="flex flex-col gap-6">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-48" /> {/* Section title */}
              <Skeleton className="h-4 w-80" /> {/* Section description */}
            </div>

            {/* Form fields - 3 columns */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Title field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>

          {/* Exam Settings Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Settings fields - 3 columns */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Status and Category - 2 columns */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Switches - 4 columns */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>

            {/* Question search button */}
            <Skeleton className="h-10 w-48" />

            {/* Selected questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-32" />
              </div>

              {/* Question cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Skeleton className="h-10 w-24" /> {/* Cancel */}
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" /> {/* Save & Exit */}
              <Skeleton className="h-10 w-48" /> {/* Save & Add Another */}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
