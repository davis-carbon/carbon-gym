"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { PersonalInfoTab } from "@/components/admin/client-detail/personal-info-tab";
import { PackagesTab } from "@/components/admin/client-detail/packages-tab";
import { MeasurementsTab } from "@/components/admin/client-detail/measurements-tab";
import { TrainerNotesTab } from "@/components/admin/client-detail/trainer-notes-tab";
import { WorkoutsTab } from "@/components/admin/client-detail/workouts-tab";
import { VisitsTab } from "@/components/admin/client-detail/visits-tab";

// Mock data — will be replaced with tRPC query
const CLIENT = {
  id: "1",
  firstName: "Tres",
  lastName: "Teschke",
  email: "tres.teschke@gmail.com",
  phone: "+1 214 453 9765",
  gender: null as string | null,
  birthDate: "1991-05-21",
  location: "CARBON",
  height: null as string | null,
  weight: null as string | null,
  aboutMe: null as string | null,
  signupDate: "2019-07-24",
  status: "ACTIVE",
  billingStatus: "PAID",
  lifecycleStage: "CLIENT",
  assignedStaff: "Mada Hauck",
  profileImageUrl: null as string | null,
  tags: ["Nutrition Engineering"],
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to accounts
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${CLIENT.firstName} ${CLIENT.lastName}`} src={CLIENT.profileImageUrl} size="lg" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{CLIENT.firstName} {CLIENT.lastName}</h1>
                <span className="text-sm text-stone-500">Client</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success">{CLIENT.billingStatus === "PAID" ? "Paid" : CLIENT.billingStatus}</Badge>
                <span className="text-sm text-stone-500">Sign up {new Date(CLIENT.signupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <DropdownMenu trigger={<MoreVertical className="h-4 w-4" />}>
              <DropdownItem>Send Message</DropdownItem>
              <DropdownItem>Charge Account</DropdownItem>
              <DropdownItem danger>Archive Client</DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="personal-info">
        <TabsList>
          <TabsTrigger value="personal-info">Personal Info</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="notes">Trainer Notes</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
        </TabsList>

        <TabsContent value="personal-info">
          <PersonalInfoTab client={CLIENT} />
        </TabsContent>
        <TabsContent value="packages">
          <PackagesTab clientId={id} />
        </TabsContent>
        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Payments / Products</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Payment history will appear here once Stripe is connected.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="measurements">
          <MeasurementsTab clientId={id} />
        </TabsContent>
        <TabsContent value="notes">
          <TrainerNotesTab clientId={id} />
        </TabsContent>
        <TabsContent value="workouts">
          <WorkoutsTab clientId={id} />
        </TabsContent>
        <TabsContent value="nutrition">
          <Card>
            <CardHeader><CardTitle>Nutrition</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Nutrition plans and logging will appear here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assessments">
          <Card>
            <CardHeader><CardTitle>Assessments</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Completed assessments will appear here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resources">
          <Card>
            <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Assigned resources will appear here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="groups">
          <Card>
            <CardHeader><CardTitle>Group Memberships</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CLIENT.tags.map((tag) => (
                  <Badge key={tag} variant="info">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="visits">
          <VisitsTab clientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
