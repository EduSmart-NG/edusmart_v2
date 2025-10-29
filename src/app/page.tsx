import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ParticlesBackground from "@/components/ui/particles-background";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  // Check if user is logged in
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ParticlesBackground />
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <h3>EduSmart</h3>
            <CardDescription>Your best school exam platform</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h4 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  Coming Soon
                </h4>
                <p className="text-muted-foreground text-sm">
                  We&apos;re working hard to bring you an amazing exam
                  preparation experience.
                </p>
              </div>

              <div className="pt-4 space-y-2">
                {session ? (
                  <Button asChild className="w-full">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild className="w-full">
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/register">Sign up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
