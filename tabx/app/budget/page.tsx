import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, AlertTriangle } from "lucide-react"

export default function BudgetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Budget Tracker</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2,500.00</div>
                  <p className="text-xs text-muted-foreground">For March 2025</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Spent So Far</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,345.67</div>
                  <p className="text-xs text-muted-foreground">53.8% of total budget</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,154.33</div>
                  <p className="text-xs text-muted-foreground">46.2% of total budget</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$37.24</div>
                  <p className="text-xs text-muted-foreground">For the next 31 days</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Budget Categories</CardTitle>
                  <CardDescription>Your spending by category for March 2025</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="space-y-8">
                    {[
                      {
                        category: "Food & Dining",
                        allocated: 600,
                        spent: 450,
                        remaining: 150,
                        percentage: 75,
                        warning: false,
                      },
                      {
                        category: "Rent & Utilities",
                        allocated: 1200,
                        spent: 1200,
                        remaining: 0,
                        percentage: 100,
                        warning: false,
                      },
                      {
                        category: "Transportation",
                        allocated: 300,
                        spent: 275,
                        remaining: 25,
                        percentage: 92,
                        warning: true,
                      },
                      {
                        category: "Entertainment",
                        allocated: 200,
                        spent: 120,
                        remaining: 80,
                        percentage: 60,
                        warning: false,
                      },
                      {
                        category: "Shopping",
                        allocated: 200,
                        spent: 180,
                        remaining: 20,
                        percentage: 90,
                        warning: true,
                      },
                    ].map((category) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{category.category}</span>
                            {category.warning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${category.spent.toFixed(2)} / ${category.allocated.toFixed(2)}
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{category.percentage}% spent</span>
                          <span>${category.remaining.toFixed(2)} remaining</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Budget Summary</CardTitle>
                  <CardDescription>Your overall budget status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Budget summary chart will be displayed here
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Detailed Report
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Categories</CardTitle>
                <CardDescription>Manage your budget categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Budget categories management will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget History</CardTitle>
                <CardDescription>View your past budget performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Budget history will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

