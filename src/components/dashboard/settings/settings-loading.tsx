import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export default function SettingsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Two-Factor Authentication Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Icon */}
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />

            <div className="flex-1 space-y-3">
              {/* Title and Badge */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              {/* Description */}
              <Skeleton className="h-4 w-full max-w-3xl" />

              {/* Method indicator */}
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>

          {/* Button */}
          <Skeleton className="h-10 w-32 rounded-md flex-shrink-0" />
        </div>
      </div>

      {/* Backup Codes Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Icon */}
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />

            <div className="flex-1 space-y-3">
              {/* Title */}
              <Skeleton className="h-8 w-48" />

              {/* Description */}
              <Skeleton className="h-4 w-full max-w-3xl" />
            </div>
          </div>

          {/* Button */}
          <Skeleton className="h-10 w-32 rounded-md flex-shrink-0" />
        </div>
      </div>

      {/* How Two-Factor Authentication Works Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-8 w-80 mb-6" />

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex gap-3">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0 mt-0.5" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
