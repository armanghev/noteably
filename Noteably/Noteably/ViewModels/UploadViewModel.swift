import SwiftUI
import UniformTypeIdentifiers

@Observable
final class UploadViewModel {
    // File selection
    var selectedFileData: Data?
    var selectedFileName: String?
    var selectedMimeType: String?

    // Material types
    var generateSummary = true
    var generateNotes = true
    var generateFlashcards = true
    var generateQuiz = true

    // Upload state
    var isUploading = false
    var uploadedJobId: String?
    var jobStatus: JobStatus?
    var currentStep: String?
    var progress: Int = 0
    var errorMessage: String?
    var isComplete = false

    private let jobsService = JobsService.shared

    var hasFile: Bool { selectedFileData != nil }

    var selectedMaterialTypes: [String] {
        var types: [String] = []
        if generateSummary { types.append("summary") }
        if generateNotes { types.append("notes") }
        if generateFlashcards { types.append("flashcards") }
        if generateQuiz { types.append("quiz") }
        return types
    }

    var canUpload: Bool {
        hasFile && !selectedMaterialTypes.isEmpty && !isUploading
    }

    // MARK: - File Selection

    func selectFile(data: Data, name: String, mimeType: String) {
        selectedFileData = data
        selectedFileName = name
        selectedMimeType = mimeType
        errorMessage = nil
    }

    func clearFile() {
        selectedFileData = nil
        selectedFileName = nil
        selectedMimeType = nil
    }

    // MARK: - Upload

    func upload() async {
        guard let data = selectedFileData,
              let name = selectedFileName,
              let mime = selectedMimeType else { return }

        isUploading = true
        errorMessage = nil
        isComplete = false

        do {
            let response = try await jobsService.processUpload(
                fileData: data,
                fileName: name,
                mimeType: mime,
                materialTypes: selectedMaterialTypes
            )
            uploadedJobId = response.jobId
            jobStatus = JobStatus(rawValue: response.status)
        } catch let error as APIError {
            errorMessage = error.errorDescription
            isUploading = false
        } catch {
            errorMessage = error.localizedDescription
            isUploading = false
        }
    }

    // MARK: - WebSocket Update Handler

    func handleJobUpdate(_ update: WebSocketJobUpdate) {
        guard update.jobId == uploadedJobId else { return }

        if let status = JobStatus(rawValue: update.status) {
            jobStatus = status
            if status == .completed {
                isComplete = true
                isUploading = false
            } else if status == .failed {
                errorMessage = update.errorMessage ?? "Processing failed."
                isUploading = false
            }
        }
        if let step = update.currentStep { currentStep = step }
        if let p = update.progress { progress = p }
    }

    // MARK: - Reset

    func reset() {
        selectedFileData = nil
        selectedFileName = nil
        selectedMimeType = nil
        generateSummary = true
        generateNotes = true
        generateFlashcards = true
        generateQuiz = true
        isUploading = false
        uploadedJobId = nil
        jobStatus = nil
        currentStep = nil
        progress = 0
        errorMessage = nil
        isComplete = false
    }

    // MARK: - Mime Type Helpers

    static let supportedTypes: [UTType] = [
        .pdf,
        .plainText,
        .mp3,
        .wav,
        .mpeg4Movie,
        .quickTimeMovie,
        .mpeg4Audio
    ]

    static func mimeType(for utType: UTType) -> String {
        if utType.conforms(to: .pdf) { return "application/pdf" }
        if utType.conforms(to: .plainText) { return "text/plain" }
        if utType.conforms(to: .mp3) { return "audio/mpeg" }
        if utType.conforms(to: .wav) { return "audio/wav" }
        if utType.conforms(to: .mpeg4Audio) { return "audio/mp4" }
        if utType.conforms(to: .mpeg4Movie) { return "video/mp4" }
        if utType.conforms(to: .quickTimeMovie) { return "video/quicktime" }
        return "application/octet-stream"
    }
}
