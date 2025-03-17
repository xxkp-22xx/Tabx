import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Filter, Plus, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ExpensesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search expenses..." className="w-full pl-8" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="roommates">Roommates</SelectItem>
                <SelectItem value="trip">Trip to Paris</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="work">Work Lunch</SelectItem>
                <SelectItem value="game">Game Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="you-paid">You Paid</TabsTrigger>
            <TabsTrigger value="you-owe">You Owe</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="px-6 py-4">
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[
                    {
                      id: "1",
                      description: "Dinner at Italian Restaurant",
                      amount: 120.5,
                      date: "Mar 10, 2025",
                      category: "Food",
                      group: "Roommates",
                      paidBy: {
                        name: "You",
                        avatar: "/placeholder-user.jpg",
                      },
                      status: "settled",
                      participants: 4,
                    },
                    {
                      id: "2",
                      description: "Uber to Airport",
                      amount: 45.75,
                      date: "Mar 9, 2025",
                      category: "Travel",
                      group: "Trip to Paris",
                      paidBy: {
                        name: "Alex",
                        avatar: "/placeholder.svg?height=32&width=32",
                      },
                      status: "pending",
                      participants: 3,
                    },
                    {
                      id: "3",
                      description: "Groceries",
                      amount: 89.32,
                      date: "Mar 8, 2025",
                      category: "Shopping",
                      group: "Family",
                      paidBy: {
                        name: "Sarah",
                        avatar: "/placeholder.svg?height=32&width=32",
                      },
                      status: "pending",
                      participants: 5,
                    },
                    {
                      id: "4",
                      description: "Movie Tickets",
                      amount: 32.5,
                      date: "Mar 7, 2025",
                      category: "Entertainment",
                      group: "Game Night",
                      paidBy: {
                        name: "You",
                        avatar: "/placeholder-user.jpg",
                      },
                      status: "settled",
                      participants: 2,
                    },
                    {
                      id: "5",
                      description: "Team Lunch",
                      amount: 156.8,
                      date: "Mar 6, 2025",
                      category: "Food",
                      group: "Work Lunch",
                      paidBy: {
                        name: "Michael",
                        avatar: "/placeholder.svg?height=32&width=32",
                      },
                      status: "pending",
                      participants: 6,
                    },
                  ].map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-6">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={expense.paidBy.avatar} />
                          <AvatarFallback>{expense.paidBy.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{expense.description}</p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span>{expense.date}</span>
                            <span className="mx-1">•</span>
                            <span>{expense.category}</span>
                            <span className="mx-1">•</span>
                            <span>{expense.group}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Paid by {expense.paidBy.name} • Split with {expense.participants} people
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="font-medium">${expense.amount.toFixed(2)}</div>
                        <Badge variant={expense.status === "settled" ? "outline" : "default"}>
                          {expense.status === "settled" ? "Settled" : "Pending"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="you-paid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses You Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">Expenses you paid will be displayed here</div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="you-owe" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses You Owe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">Expenses you owe will be displayed here</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

