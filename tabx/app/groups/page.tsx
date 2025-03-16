import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Users } from "lucide-react"

export default function GroupsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Groups</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search groups..." className="w-full pl-8" />
          </div>
        </div>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Groups</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: "1",
                  name: "Roommates",
                  description: "Expenses for our apartment",
                  members: 4,
                  totalExpenses: 1245.67,
                  owedToYou: 345.67,
                  youOwe: 0,
                  avatarSrc: "/placeholder.svg?height=40&width=40",
                },
                {
                  id: "2",
                  name: "Trip to Paris",
                  description: "Our amazing vacation",
                  members: 3,
                  totalExpenses: 2456.89,
                  owedToYou: 0,
                  youOwe: 245.12,
                  avatarSrc: "/placeholder.svg?height=40&width=40",
                },
                {
                  id: "3",
                  name: "Family",
                  description: "Family expenses",
                  members: 5,
                  totalExpenses: 567.34,
                  owedToYou: 123.45,
                  youOwe: 0,
                  avatarSrc: "/placeholder.svg?height=40&width=40",
                },
                {
                  id: "4",
                  name: "Work Lunch",
                  description: "Team lunch expenses",
                  members: 6,
                  totalExpenses: 345.12,
                  owedToYou: 0,
                  youOwe: 57.52,
                  avatarSrc: "/placeholder.svg?height=40&width=40",
                },
                {
                  id: "5",
                  name: "Game Night",
                  description: "Weekly game night",
                  members: 8,
                  totalExpenses: 123.45,
                  owedToYou: 15.43,
                  youOwe: 0,
                  avatarSrc: "/placeholder.svg?height=40&width=40",
                },
              ].map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={group.avatarSrc} />
                        <AvatarFallback>{group.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{group.name}</CardTitle>
                        <CardDescription>{group.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center justify-between py-1">
                      <div className="text-sm text-muted-foreground">Members</div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        <span>{group.members}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div>${group.totalExpenses.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="text-sm text-muted-foreground">
                        {group.owedToYou > 0 ? "Owed to you" : "You owe"}
                      </div>
                      <div className={group.owedToYou > 0 ? "text-accent" : "text-destructive"}>
                        ${(group.owedToYou > 0 ? group.owedToYou : group.youOwe).toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button size="sm">Add Expense</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Active groups would be displayed here */}
              <Card className="flex h-40 items-center justify-center">
                <CardContent>
                  <div className="text-center text-muted-foreground">Active groups will be displayed here</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="archived" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Archived groups would be displayed here */}
              <Card className="flex h-40 items-center justify-center">
                <CardContent>
                  <div className="text-center text-muted-foreground">Archived groups will be displayed here</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

