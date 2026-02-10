import Foundation

// MARK: - Export Service

final class ExportService {
    static let shared = ExportService()
    private let api = APIClient.shared

    private init() {}

    // MARK: - Export

    func exportJob(
        jobId: String,
        format: String,
        materialTypes: [String],
        includeTranscript: Bool = false,
        includeMetadata: Bool = true
    ) async throws -> ExportResponse {
        let request = ExportRequest(
            jobId: jobId,
            format: format,
            materialTypes: materialTypes,
            options: ExportOptions(
                includeTranscript: includeTranscript,
                includeMetadata: includeMetadata
            )
        )
        return try await api.post(path: "/api/export", body: request)
    }

    // MARK: - Download exported file

    func downloadExport(url: String) async throws -> Data {
        try await api.downloadData(path: url)
    }
}
