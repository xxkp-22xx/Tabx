"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Upload, Wallet } from "lucide-react"

export function AddExpenseModal() {
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    // Simulate adding expense
    setTimeout(() => {
      setIsLoading(false)
      setOpen(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add an Expense</DialogTitle>
          <DialogDescription>Enter the details of your expense to split with your group.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                <Input id="amount" placeholder="0.00" className="pl-7" type="number" step="0.01" required />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input id="description" placeholder="What was this expense for?" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="group" className="text-right">
                Group
              </Label>
              <Select defaultValue="roommates">
                <SelectTrigger id="group" className="col-span-3">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roommates">Roommates</SelectItem>
                  <SelectItem value="trip">Trip to Paris</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="work">Work Lunch</SelectItem>
                  <SelectItem value="game">Game Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select defaultValue="food">
                <SelectTrigger id="category" className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receipt" className="text-right">
                Receipt
              </Label>
              <div className="col-span-3">
                <Button variant="outline" type="button" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Receipt
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Split With</Label>
              <div className="col-span-3 space-y-4">
                <Tabs defaultValue="equal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="equal">Equal</TabsTrigger>
                    <TabsTrigger value="percentage">Percentage</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                  <TabsContent value="equal" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      {[
                        { id: "1", name: "You", avatar: "/placeholder-user.jpg" },
                        { id: "2", name: "Alex", avatar: "/placeholder.svg?height=32&width=32" },
                        { id: "3", name: "Sarah", avatar: "/placeholder.svg?height=32&width=32" },
                        { id: "4", name: "Michael", avatar: "/placeholder.svg?height=32&width=32" },
                      ].map((person) => (
                        <div key={person.id} className="flex items-center space-x-2">
                          <Checkbox id={`person-${person.id}`} defaultChecked />
                          <Label htmlFor={`person-${person.id}`} className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={person.avatar} />
                              <AvatarFallback>{person.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span>{person.name}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="percentage" className="pt-4">
                    <div className="text-center py-4 text-muted-foreground">
                      Percentage split options will be displayed here
                    </div>
                  </TabsContent>
                  <TabsContent value="custom" className="pt-4">
                    <div className="text-center py-4 text-muted-foreground">
                      Custom split options will be displayed here
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea id="notes" placeholder="Add any additional notes here..." className="col-span-3" />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
            <Button type="button" variant="outline" className="mb-2 sm:mb-0">
              <Wallet className="mr-2 h-4 w-4" />
              Settle with Crypto
            </Button>
            <div className="flex flex-col sm:flex-row sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mb-2 sm:mb-0">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

