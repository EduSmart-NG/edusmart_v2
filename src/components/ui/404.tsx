import React from "react";
import { Card } from "./card";
import { FileQuestion } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import ParticlesBackground from "./particles-background";

const NotFoundComponent = ({ redirectLink }: { redirectLink: string }) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4">
      <div className="absolute inset-0 -z-10">
        <ParticlesBackground />
      </div>
      <Card className="relative z-10 w-full max-w-md space-y-6 p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="size-8 text-muted-foreground" />
          </div>

          {/* 404 Number */}
          <h1 className="mb-2 text-6xl font-bold tracking-tight">404</h1>

          {/* Error Title */}
          <h2 className="mb-3 text-2xl font-semibold">Page Not Found</h2>

          {/* Description */}
          <p className="mb-6 text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Please check the URL or return to the home page.
          </p>

          {/* Action Button */}
          <Button asChild className="w-full">
            <Link href={redirectLink}>Return to Home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFoundComponent;
