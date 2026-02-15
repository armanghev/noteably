import Foundation

// MARK: - Jobs Service

final class JobsService {
    static let shared = JobsService()
    private let api = APIClient.shared
    private let cache = CacheService.shared

    private init() {}

    // MARK: - List Jobs

    func listJobs(cursor: String? = nil) async throws -> PaginatedResponse<JobListItem> {
        var queryItems: [URLQueryItem] = []
        if let cursor {
            queryItems.append(URLQueryItem(name: "cursor", value: cursor))
        }
        let response: PaginatedResponse<JobListItem> = try await api.get(
            path: "/api/jobs/",
            queryItems: queryItems.isEmpty ? nil : queryItems
        )
        cache.save(response, forKey: CacheService.jobsListKey)
        return response
    }

    func cachedJobsList() -> PaginatedResponse<JobListItem>? {
        cache.load(PaginatedResponse<JobListItem>.self, forKey: CacheService.jobsListKey)
    }

    // MARK: - Get Job Detail

    func getJob(id: String) async throws -> Job {
        try await api.get(path: "/api/jobs/\(id)/")
    }

    // MARK: - Upload / Process

    func processUpload(
        fileData: Data,
        fileName: String,
        mimeType: String,
        materialTypes: [String],
        options: JobOptions? = nil
    ) async throws -> ProcessUploadResponse {
        var fields: [String: String] = [
            "material_types": materialTypes.joined(separator: ",")
        ]
        if let options {
            if let length = options.summaryLength { fields["summary_length"] = length }
            if let count = options.flashcardCount { fields["flashcard_count"] = "\(count)" }
            if let count = options.quizQuestionCount { fields["quiz_question_count"] = "\(count)" }
            if let difficulty = options.difficulty { fields["difficulty"] = difficulty }
        }

        return try await api.upload(
            path: "/api/process",
            fileData: fileData,
            fileName: fileName,
            mimeType: mimeType,
            fields: fields
        )
    }

    // MARK: - YouTube

    func getYoutubeMeta(url: String) async throws -> YoutubeMeta {
        let queryItems = [URLQueryItem(name: "url", value: url)]
        return try await api.get(path: "/api/youtube/meta", queryItems: queryItems)
    }

    func processYoutube(
        url: String,
        materialTypes: [String],
        options: JobOptions? = nil
    ) async throws -> ProcessUploadResponse {
        let body = ProcessYoutubeRequest(
            url: url,
            materialTypes: materialTypes,
            options: options
        )
        return try await api.post(path: "/api/process/youtube", body: body)
    }

    // MARK: - Dashboard

    func getDashboard() async throws -> DashboardResponse {
        let response: DashboardResponse = try await api.get(path: "/api/dashboard/")
        cache.save(response, forKey: CacheService.dashboardKey)
        return response
    }

    func cachedDashboard() -> DashboardResponse? {
        cache.load(DashboardResponse.self, forKey: CacheService.dashboardKey)
    }

    // MARK: - Signed URL

    func getSignedURL(jobId: String) async throws -> SignedURLResponse {
        try await api.get(path: "/api/jobs/\(jobId)/signed-url/")
    }

    // MARK: - Job Actions

    func deleteJob(id: String) async throws -> JobActionResponse {
        let response: JobActionResponse = try await api.delete(path: "/api/jobs/\(id)/")
        cache.remove(forKey: CacheService.contentKey(jobId: id))
        cache.remove(forKey: CacheService.jobsListKey)
        cache.remove(forKey: CacheService.dashboardKey)
        return response
    }

    func retryJob(id: String) async throws -> JobActionResponse {
        try await api.post(path: "/api/jobs/\(id)/retry/")
    }

    func cancelJob(id: String) async throws -> JobActionResponse {
        try await api.post(path: "/api/jobs/\(id)/cancel/")
    }
}
