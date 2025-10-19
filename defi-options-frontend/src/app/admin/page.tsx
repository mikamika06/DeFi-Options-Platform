"use client";

import { AdminDashboard } from "@/components/admin/AdminDashboard.new";

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <AdminDashboard />
    </div>
  );
}
