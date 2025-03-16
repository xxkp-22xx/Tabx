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
import { Wallet, ArrowRight, Check, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function BlockchainPayment() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [open, setOpen] = useState(false)

  function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    // Simulate blockchain transaction
    setTimeout(() => {
      setIsLoading(false)
      setStep(2)
    }, 2000)
  }

  function resetAndClose() {
    setStep(1)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wallet className="mr-2 h-4 w-4" />
          Settle with Crypto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Blockchain Payment</DialogTitle>
          <DialogDescription>Settle your expenses using cryptocurrency.</DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <form onSubmit={onSubmit}>
            <div className="grid gap-4 py-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                  <CardDescription>You are about to pay the following amount</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">$45.75</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Gas Fee (est.)</span>
                    <span className="font-medium">$1.23</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">$46.98</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex justify-between w-full">
                    <span className="text-muted-foreground">Equivalent in ETH</span>
                    <span className="font-medium">0.0123 ETH</span>
                  </div>
                </CardFooter>
              </Card>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="wallet" className="text-right">
                  Recipient
                </Label>
                <Input id="wallet" value="0x1a2b3c4d5e6f7g8h9i0j" className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="network" className="text-right">
                  Network
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <span>Ethereum Mainnet</span>
                  <Badge variant="outline">ETH</Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-accent/20 p-3">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Payment Successful!</h3>
              <p className="text-center text-muted-foreground">
                Your payment of 0.0123 ETH has been successfully processed.
              </p>
              <Card className="w-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Transaction Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Transaction Hash</span>
                    <span className="font-medium">0x1a2...3b4c</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="bg-accent/20 text-accent">
                      Confirmed
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Block</span>
                    <span className="font-medium">#14582637</span>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={resetAndClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

