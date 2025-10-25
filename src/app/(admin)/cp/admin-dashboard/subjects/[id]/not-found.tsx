import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Subject Not Found</CardTitle>
          <CardDescription className="text-base">
            The subject you&lsquo;re looking for doesn&lsquo;t exist or may have
            been deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Please check the URL or return to the subjects list to find the exam
            you need.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/cp/admin-dashboard/subjects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subjects
              </Link>
            </Button>
            <Button asChild>
              <Link href="/cp/admin-dashboard/subjects/new">
                Create New Subject
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
