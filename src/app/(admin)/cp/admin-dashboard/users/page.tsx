import { Suspense } from "react";
import { Users, UserPlus, Shield, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { columns } from "@/components/admin/user-column";
import { DataTable } from "@/components/admin/data-table";
import { listUsers } from "@/lib/actions/admin";
import type { AdminUser, UserListResponse } from "@/types/admin";
import Link from "next/link";

async function getUsersData(): Promise<UserListResponse> {
  const result = await listUsers();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch users");
  }

  return result.data;
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatsCards({ users }: { users: UserListResponse }) {
  const totalUsers = users.total;
  const activeUsers = users.users.filter((u: AdminUser) => !u.banned).length;
  const bannedUsers = users.users.filter((u: AdminUser) => u.banned).length;
  const adminUsers = users.users.filter(
    (u: AdminUser) => u.role === "admin"
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Users"
        value={totalUsers}
        description="All registered users"
        icon={Users}
      />
      <StatsCard
        title="Active Users"
        value={activeUsers}
        description="Users with active accounts"
        icon={Users}
      />
      <StatsCard
        title="Banned Users"
        value={bannedUsers}
        description="Suspended accounts"
        icon={Ban}
      />
      <StatsCard
        title="Admin Users"
        value={adminUsers}
        description="Users with admin role"
        icon={Shield}
      />
    </div>
  );
}

function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="mb-4 h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function AdminUsersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          <Link href="/cp/admin-dashboard/users/new">Add User</Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[100px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px]" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <UsersStats />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage all registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<DataTableSkeleton />}>
            <UsersTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersStats() {
  const data = await getUsersData();
  return <StatsCards users={data} />;
}

async function UsersTable() {
  const data = await getUsersData();
  return <DataTable columns={columns} data={data.users} />;
}
