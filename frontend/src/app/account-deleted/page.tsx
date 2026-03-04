"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountDeleted() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full mx-auto">
        <Card className="border-border bg-success/5 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <CheckCircle className="h-8 w-8 text-success flex-shrink-0 mt-0.5" />
              <div className="space-y-4 flex-1">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Account Deletion Initiated
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Your account deletion request has been processed. Check your
                    email for recovery instructions.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground/80">
                  You have a grace period to recover your account by clicking
                  the link in the email we just sent you. After the grace period
                  expires, your account and all associated data will be
                  permanently deleted.
                </p>
                <div className="pt-4 flex gap-2">
                  <Button onClick={() => router.push("/")} variant="outline">
                    Return to Home
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
