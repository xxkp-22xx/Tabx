import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button>Add Expense</Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,234.56</div>
                  <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">You Owe</CardTitle>
                  <ArrowUpIcon className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">$245.12</div>
                  <p className="text-xs text-muted-foreground">4 pending payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
                  <ArrowDownIcon className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">$345.89</div>
                  <p className="text-xs text-muted-foreground">6 pending receipts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">12 total members</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: "1",
                        description: "Dinner at Italian Restaurant",
                        amount: 120.5,
                        date: "Today",
                        category: "Food",
                        paidBy: "You",
                        status: "settled",
                      },
                      {
                        id: "2",
                        description: "Uber to Airport",
                        amount: 45.75,
                        date: "Yesterday",
                        category: "Travel",
                        paidBy: "Alex",
                        status: "pending",
                      },
                      {
                        id: "3",
                        description: "Groceries",
                        amount: 89.32,
                        date: "2 days ago",
                        category: "Shopping",
                        paidBy: "Sarah",
                        status: "pending",
                      },
                      {
                        id: "4",
                        description: "Movie Tickets",
                        amount: 32.5,
                        date: "3 days ago",
                        category: "Entertainment",
                        paidBy: "You",
                        status: "settled",
                      },
                    ].map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {expense.date} • {expense.category} • Paid by {expense.paidBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={expense.status === "settled" ? "outline" : "default"}>
                            {expense.status === "settled" ? "Settled" : "Pending"}
                          </Badge>
                          <div className="font-medium">${expense.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Your Groups</CardTitle>
                  <CardDescription>You have 5 active groups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: "1",
                        name: "Roommates",
                        members: 4,
                        totalExpenses: 1245.67,
                        avatarSrc: "/placeholder.svg?height=32&width=32",
                      },
                      {
                        id: "2",
                        name: "Trip to Paris",
                        members: 3,
                        totalExpenses: 2456.89,
                        avatarSrc: "/placeholder.svg?height=32&width=32",
                      },
                      {
                        id: "3",
                        name: "Family",
                        members: 5,
                        totalExpenses: 567.34,
                        avatarSrc: "/placeholder.svg?height=32&width=32",
                      },
                      {
                        id: "4",
                        name: "Work Lunch",
                        members: 6,
                        totalExpenses: 345.12,
                        avatarSrc: "/placeholder.svg?height=32&width=32",
                      },
                      {
                        id: "5",
                        name: "Game Night",
                        members: 8,
                        totalExpenses: 123.45,
                        avatarSrc: "/placeholder.svg?height=32&width=32",
                      },
                    ].map((group) => (
                      <div key={group.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={group.avatarSrc} />
                            <AvatarFallback>{group.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">{group.name}</p>
                            <p className="text-sm text-muted-foreground">{group.members} members</p>
                          </div>
                        </div>
                        <div className="font-medium">${group.totalExpenses.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending Analytics</CardTitle>
                <CardDescription>Your spending patterns over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Analytics charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Reports</CardTitle>
                <CardDescription>Download your expense reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Monthly reports will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

