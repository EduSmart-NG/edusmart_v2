import { Metadata } from "next";
import CreateUserForm from "@/components/admin/create-user-form";

export const metadata: Metadata = {
  title: "Create User | Admin Panel",
  description: "Create a new user account with admin privileges",
};

export default function CreateUserPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Create a new user account. A secure temporary password will be
          generated and must be changed on first login.
        </p>
      </div>

      {/* Security Notice */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-primary">Security Notice</h4>
            <p className="text-sm text-primary">
              The generated temporary password will be sent to the user, please
              copy the password from the console and securely share it with the
              new user.
            </p>
          </div>
        </div>
      </div>

      {/* Create User Form */}
      <CreateUserForm />
    </div>
  );
}
