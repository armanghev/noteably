import { InstagramIcon, TikTokIcon } from "@/components/SocialIcons";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MessageSquare, Send, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          <header className="mb-16">
            <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
              Get in touch.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Have questions about Noteably or want to collaborate? We'd love to
              hear from you. Fill out the form below and we'll get back to you
              as soon as possible.
            </p>
          </header>

          <div className="grid md:grid-cols-[1fr_350px] gap-12">
            {/* Form Section */}
            <div className="bg-muted/30 p-8 rounded-3xl border border-primary/10 backdrop-blur-sm">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5" /> Name
                      </label>
                      <input
                        required
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </label>
                      <input
                        required
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="subject"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Subject
                    </label>
                    <input
                      required
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </label>
                    <textarea
                      required
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Your message here..."
                      rows={6}
                      className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 resize-none"
                    />
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif">Message Sent!</h3>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. We've received your message and
                    will get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Send another message
                  </button>
                </motion.div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-12">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
                  Our Presence
                </h4>
                <div className="p-6 rounded-2xl bg-muted/20 border border-primary/5 hover:border-primary/10 transition-colors">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary/60 mb-6">
                    Socials
                  </h4>
                  <div className="space-y-6">
                    <a
                      href="https://www.instagram.com/noteably.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <InstagramIcon size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                          Instagram
                        </p>
                        <p className="font-medium">@noteably.ai</p>
                      </div>
                    </a>
                    <a
                      href="https://www.tiktok.com/@noteably.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <TikTokIcon size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                          TikTok
                        </p>
                        <p className="font-medium">@noteably.ai</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-primary text-primary-foreground">
                <h4 className="font-serif text-xl mb-4">Join the waitlist.</h4>
                <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                  Experience the future of intelligent study notes. Sign up now
                  to get early access.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
