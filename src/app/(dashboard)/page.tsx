import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";




export default function DashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <SidebarTrigger />
      <h1 className="text-2xl font-semibold">
        Main content
      </h1>
    </div>
  )
}