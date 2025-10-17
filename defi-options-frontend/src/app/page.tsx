"use client";

import DeFiDashboard from "@/components/DeFiDashboard";
import { DirectEthersTest } from "@/components/test/DirectEthersTest";
import { JsonRpcTest } from "@/components/test/JsonRpcTest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="border-b bg-white">
          <div className="container mx-auto">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="dashboard">🏠 Dashboard</TabsTrigger>
              <TabsTrigger value="testing">🧪 Testing</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="m-0 p-0">
          <DeFiDashboard />
        </TabsContent>

        <TabsContent
          value="testing"
          className="container mx-auto p-6 space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectEthersTest />
            <JsonRpcTest />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
