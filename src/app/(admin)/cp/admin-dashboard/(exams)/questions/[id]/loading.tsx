import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      {/* Page Header Skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-80" /> {/* Title */}
        <Skeleton className="h-5 w-96" /> {/* Subtitle */}
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

            {/* Form fields - 3 columns (Exam Type, Year, Subject) */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Question Type, Difficulty, Points - 3 columns */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Tags and Time Limit - 2 columns */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" /> {/* Helper text */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" /> {/* Helper text */}
              </div>
            </div>
          </div>

          {/* Question Content Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>

            {/* Question Image Upload */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-36" /> {/* Upload button */}
              </div>
              <Skeleton className="h-3 w-80" /> {/* Helper text */}
            </div>
          </div>

          {/* Answer Options Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Option cards */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-6 w-11 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Option text input */}
                  <Skeleton className="h-10 w-full" />

                  {/* Option image upload */}
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-32" />
                  </div>
                  <Skeleton className="h-3 w-96" />
                </div>
              ))}

              {/* Add option button */}
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>

            {/* Answer Explanation */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <Skeleton className="h-10 w-full md:w-40" />
            <Skeleton className="h-10 w-full md:w-52" />
          </div>
        </div>
      </Card>
    </div>
  );
}
