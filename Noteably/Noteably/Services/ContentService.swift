import Foundation

// MARK: - Content Service

final class ContentService {
    static let shared = ContentService()
    private let api = APIClient.shared
    private let cache = CacheService.shared

    private init() {}

    // MARK: - Get Content

    func getContent(jobId: String) async throws -> ContentResponse {
        let response: ContentResponse = try await api.get(path: "/api/content/\(jobId)/")
        cache.save(response, forKey: CacheService.contentKey(jobId: jobId))
        return response
    }

    func cachedContent(jobId: String) -> ContentResponse? {
        cache.load(ContentResponse.self, forKey: CacheService.contentKey(jobId: jobId))
    }
}
