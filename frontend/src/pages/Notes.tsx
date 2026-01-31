import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useJobs } from "@/hooks/useJobs";
import { formatFileType } from "@/lib/utils";
import { FileText, Filter, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Notes() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter for completed jobs only
  const completedJobs = jobs?.filter((job) => job.status === "completed") || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-foreground">My Notes</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              className="pl-10 pr-4 py-2 rounded-full border border-border focus:outline-none focus:border-primary w-64 bg-background"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full text-muted-foreground"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {completedJobs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            No notes yet. Upload your first file to get started!
          </p>
          <Button onClick={() => navigate("/upload")} className="mt-4">
            Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedJobs.map((job) => (
            <Card
              key={job.id}
              onClick={() =>
                navigate(`/notes/${job.id}`, { state: { from: "/notes" } })
              }
              className="p-6 cursor-pointer hover:shadow-md transition-shadow group bg-background border-border"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(job.created_at)}
                </span>
              </div>
              <h3 className="font-serif text-lg font-medium mb-2 text-foreground">
                {job.summary_title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {job.summary_preview || "No summary available."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                  {formatFileType(job.file_type)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
