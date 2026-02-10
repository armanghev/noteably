import Foundation

@Observable
final class DashboardViewModel {
    var dashboard: DashboardResponse?
    var isLoading = false
    var errorMessage: String?

    private let jobsService = JobsService.shared
    private let cache = CacheService.shared

    init(dashboard: DashboardResponse? = nil) {
        if let dashboard {
            self.dashboard = dashboard
        } else {
            // Load cached data immediately
            self.dashboard = jobsService.cachedDashboard()
        }
    }

    func loadDashboard() async {
        isLoading = dashboard == nil // Only show spinner on first load
        errorMessage = nil

        do {
            dashboard = try await jobsService.getDashboard()
        } catch let error as APIError {
            if dashboard == nil {
                errorMessage = error.errorDescription
            }
            // If we have cached data, silently fail
        } catch {
            if dashboard == nil {
                errorMessage = error.localizedDescription
            }
        }

        isLoading = false
    }

    var stats: DashboardStats? { dashboard?.stats }
    var recentJobs: [RecentJob] { dashboard?.recentJobs ?? [] }
    var totalNotes: Int { stats?.totalNotes ?? 0 }
    var totalFlashcards: Int { stats?.totalFlashcards ?? 0 }
}
