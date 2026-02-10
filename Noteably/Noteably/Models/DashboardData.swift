import Foundation

// MARK: - Dashboard Response

struct DashboardResponse: Codable {
    let stats: DashboardStats
    let recentJobs: [RecentJob]

    enum CodingKeys: String, CodingKey {
        case stats
        case recentJobs = "recent_jobs"
    }
}

struct DashboardStats: Codable {
    let totalNotes: Int
    let totalFlashcards: Int

    enum CodingKeys: String, CodingKey {
        case totalNotes = "total_notes"
        case totalFlashcards = "total_flashcards"
    }
}

struct RecentJob: Codable, Identifiable {
    let id: String
    let filename: String
    let fileType: String
    let status: JobStatus
    let createdAt: String
    let cachedFlashcardCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, filename
        case fileType = "file_type"
        case status
        case createdAt = "created_at"
        case cachedFlashcardCount = "cached_flashcard_count"
    }
}
