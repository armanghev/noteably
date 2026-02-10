import Foundation

@Observable
final class StudySetsViewModel {
    var jobs: [JobListItem] = []
    var isLoading = false
    var isLoadingMore = false
    var errorMessage: String?
    var searchText = ""
    var nextCursor: String?
    var hasMore = true

    private let jobsService = JobsService.shared

    init(jobs: [JobListItem]? = nil) {
        if let jobs {
            self.jobs = jobs
        } else if let cached = jobsService.cachedJobsList() {
            // Load cached
            self.jobs = cached.results
            nextCursor = cached.next
            hasMore = cached.next != nil
        }
    }

    var filteredJobs: [JobListItem] {
        guard !searchText.isEmpty else { return jobs }
        return jobs.filter {
            $0.filename.localizedCaseInsensitiveContains(searchText) ||
            ($0.summaryTitle?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    func loadJobs() async {
        isLoading = jobs.isEmpty
        errorMessage = nil

        do {
            let response = try await jobsService.listJobs()
            jobs = response.results
            nextCursor = response.next
            hasMore = response.next != nil
        } catch let error as APIError {
            if jobs.isEmpty { errorMessage = error.errorDescription }
        } catch {
            if jobs.isEmpty { errorMessage = error.localizedDescription }
        }

        isLoading = false
    }

    func loadMore() async {
        guard hasMore, !isLoadingMore, let cursor = nextCursor else { return }
        isLoadingMore = true

        do {
            let response = try await jobsService.listJobs(cursor: cursor)
            jobs.append(contentsOf: response.results)
            nextCursor = response.next
            hasMore = response.next != nil
        } catch {
            // Silently fail on pagination errors
        }

        isLoadingMore = false
    }

    func deleteJob(id: String) async {
        do {
            _ = try await jobsService.deleteJob(id: id)
            jobs.removeAll { $0.id == id }
        } catch {
            errorMessage = "Failed to delete."
        }
    }
}
