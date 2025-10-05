import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <Link href="/auth/login">Login</Link>
      <Link href="/dashboard">Dashboard</Link>
    </div>
  );
}
