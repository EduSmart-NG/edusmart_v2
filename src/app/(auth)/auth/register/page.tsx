import { RegisterForm } from "@/components/auth/register-form";

export default function StudentOnboardingPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          EduSmart.
        </a>
        <RegisterForm />
      </div>
    </div>
  );
}
