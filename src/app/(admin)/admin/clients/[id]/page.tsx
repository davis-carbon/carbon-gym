"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, MoreVertical, Loader2 } from "lucide-react";
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
import { trpc } from "@/trpc/client";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, isLoading, error } = trpc.clients.byId.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading client...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-red-600">Client not found or access denied.</p>
        <Link href="/admin/clients" className="text-sm text-stone-500 underline mt-2 inline-block">
          Back to accounts
        </Link>
      </div>
    );
  }

  const staffName = client.assignedStaff
    ? `${client.assignedStaff.firstName} ${client.assignedStaff.lastName}`
    : null;

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
            <Avatar name={`${client.firstName} ${client.lastName}`} src={client.profileImageUrl} size="lg" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{client.firstName} {client.lastName}</h1>
                <span className="text-sm text-stone-500">{client.lifecycleStage.charAt(0) + client.lifecycleStage.slice(1).toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={client.billingStatus === "PAID" ? "success" : client.billingStatus === "NON_BILLED" ? "outline" : "warning"}>
                  {client.billingStatus.charAt(0) + client.billingStatus.slice(1).toLowerCase().replace("_", " ")}
                </Badge>
                <span className="text-sm text-stone-500">
                  Sign up {new Date(client.signupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {staffName && <span className="text-sm text-stone-400">· Assigned to {staffName}</span>}
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
          <PersonalInfoTab client={{
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email || "",
            phone: client.phone || "",
            gender: client.gender,
            birthDate: client.birthDate ? new Date(client.birthDate).toISOString().split("T")[0] : "",
            location: "",
            height: client.height,
            weight: client.weight,
            aboutMe: client.aboutMe,
          }} />
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
              {client.groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.groups.map((g) => (
                    <Badge key={g.group.id} variant="info">{g.group.name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">Not a member of any groups.</p>
              )}
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
