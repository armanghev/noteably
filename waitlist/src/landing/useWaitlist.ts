import { supabase } from "@/lib/supabase";
import { useState } from "react";

export const useWaitlist = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert([{ email }]);
      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join waitlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { email, setEmail, isSubmitting, isSubmitted, error, subscribe };
};
