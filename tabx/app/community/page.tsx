import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Search, Send, Plus } from "lucide-react"

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Community</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Topic
            </Button>
          </div>
        </div>
        <Tabs defaultValue="discussions" className="mt-4 space-y-4">
          <TabsList>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="group-chats">Group Chats</TabsTrigger>
            <TabsTrigger value="help">Help & Support</TabsTrigger>
          </TabsList>
          <TabsContent value="discussions" className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search discussions..." className="w-full pl-8" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: "1",
                  title: "Best practices for group expenses",
                  description: "Tips and tricks for managing expenses in large groups",
                  author: {
                    name: "Sarah Johnson",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 24,
                  views: 156,
                  tags: ["Tips", "Groups"],
                },
                {
                  id: "2",
                  title: "How to use crypto for settlements",
                  description: "A guide to using cryptocurrency for expense settlements",
                  author: {
                    name: "Alex Chen",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 18,
                  views: 203,
                  tags: ["Crypto", "Blockchain", "Guide"],
                },
                {
                  id: "3",
                  title: "Budgeting strategies for roommates",
                  description: "Effective budgeting strategies for shared living expenses",
                  author: {
                    name: "Michael Brown",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 32,
                  views: 278,
                  tags: ["Budgeting", "Roommates"],
                },
                {
                  id: "4",
                  title: "Trip planning and expense management",
                  description: "How to plan and manage expenses for group trips",
                  author: {
                    name: "Emily Davis",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 15,
                  views: 142,
                  tags: ["Travel", "Planning"],
                },
                {
                  id: "5",
                  title: "Tax implications of shared expenses",
                  description: "Understanding the tax implications of shared expenses and settlements",
                  author: {
                    name: "David Wilson",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 9,
                  views: 87,
                  tags: ["Taxes", "Legal"],
                },
                {
                  id: "6",
                  title: "Integrating TabX with other financial apps",
                  description: "How to integrate TabX with your existing financial tools",
                  author: {
                    name: "Jessica Lee",
                    avatar: "/placeholder.svg?height=32&width=32",
                  },
                  replies: 12,
                  views: 104,
                  tags: ["Integration", "Tools"],
                },
              ].map((discussion) => (
                <Card key={discussion.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{discussion.title}</CardTitle>
                    <CardDescription>{discussion.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={discussion.author.avatar} />
                        <AvatarFallback>{discussion.author.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{discussion.author.name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {discussion.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MessageSquare className="mr-1 h-4 w-4" />
                      {discussion.replies} replies
                    </div>
                    <div>{discussion.views} views</div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="group-chats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle>Group Chats</CardTitle>
                    <CardDescription>Chat with your expense groups</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {[
                        {
                          id: "1",
                          name: "Roommates",
                          lastMessage: "When are we paying the rent?",
                          time: "5m ago",
                          unread: 3,
                          avatar: "/placeholder.svg?height=40&width=40",
                        },
                        {
                          id: "2",
                          name: "Trip to Paris",
                          lastMessage: "I've added the hotel expenses",
                          time: "2h ago",
                          unread: 0,
                          avatar: "/placeholder.svg?height=40&width=40",
                        },
                        {
                          id: "3",
                          name: "Family",
                          lastMessage: "Let's split the grocery bill",
                          time: "1d ago",
                          unread: 0,
                          avatar: "/placeholder.svg?height=40&width=40",
                        },
                        {
                          id: "4",
                          name: "Work Lunch",
                          lastMessage: "I'll settle my part tomorrow",
                          time: "2d ago",
                          unread: 0,
                          avatar: "/placeholder.svg?height=40&width=40",
                        },
                      ].map((chat) => (
                        <div
                          key={chat.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src={chat.avatar} />
                              <AvatarFallback>{chat.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{chat.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">{chat.lastMessage}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span className="text-xs text-muted-foreground">{chat.time}</span>
                            {chat.unread > 0 && (
                              <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                {chat.unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="border-b pb-3">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src="/placeholder.svg?height=40&width=40" />
                        <AvatarFallback>RM</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>Roommates</CardTitle>
                        <CardDescription>4 members</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      {[
                        {
                          id: "1",
                          sender: {
                            name: "Alex",
                            avatar: "/placeholder.svg?height=32&width=32",
                            isYou: false,
                          },
                          message: "Hey everyone, I just added the electricity bill to our expenses.",
                          time: "10:30 AM",
                        },
                        {
                          id: "2",
                          sender: {
                            name: "Sarah",
                            avatar: "/placeholder.svg?height=32&width=32",
                            isYou: false,
                          },
                          message: "Thanks Alex! I'll settle my part by tomorrow.",
                          time: "10:32 AM",
                        },
                        {
                          id: "3",
                          sender: {
                            name: "You",
                            avatar: "/placeholder-user.jpg",
                            isYou: true,
                          },
                          message: "I've already paid my share using the blockchain settlement option.",
                          time: "10:35 AM",
                        },
                        {
                          id: "4",
                          sender: {
                            name: "Michael",
                            avatar: "/placeholder.svg?height=32&width=32",
                            isYou: false,
                          },
                          message: "When are we paying the rent?",
                          time: "10:45 AM",
                        },
                      ].map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender.isYou ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex max-w-[80%] ${message.sender.isYou ? "flex-row-reverse" : "flex-row"}`}>
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback>{message.sender.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className={`mx-2 ${message.sender.isYou ? "text-right" : "text-left"}`}>
                              <div
                                className={`rounded-lg p-3 ${message.sender.isYou ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                              >
                                {message.message}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {message.sender.isYou ? "You" : message.sender.name} • {message.time}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t p-3">
                    <div className="flex w-full items-center space-x-2">
                      <Input placeholder="Type your message..." className="flex-1" />
                      <Button size="icon">
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
                <CardDescription>Get help with using TabX</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-medium">How do I create a group?</h3>
                          <p className="text-sm text-muted-foreground">
                            Go to the Groups page and click on "Create Group" button. Fill in the details and invite
                            your friends.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium">How do blockchain settlements work?</h3>
                          <p className="text-sm text-muted-foreground">
                            When settling an expense, choose the "Settle with Crypto" option. Connect your wallet and
                            confirm the transaction.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium">How do I set up a budget?</h3>
                          <p className="text-sm text-muted-foreground">
                            Navigate to the Budget page and click "Create Budget". You can set limits for different
                            categories.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        View All FAQs
                      </Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Support</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input id="subject" placeholder="What do you need help with?" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Describe your issue in detail..."
                            className="min-h-[100px]"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Submit Ticket</Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

