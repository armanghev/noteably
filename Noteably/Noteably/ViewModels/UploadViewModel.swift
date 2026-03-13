import SwiftUI
import UniformTypeIdentifiers

@Observable
final class UploadViewModel {
    enum UploadMode: String, CaseIterable {
        case file
        case youtube
        case googleDrive
        case dropbox
        
        var title: String {
            switch self {
            case .file: return "File"
            case .youtube: return "YouTube"
            case .googleDrive: return "Google Drive"
            case .dropbox: return "Dropbox"
            }
        }
        
        var iconName: String {
            switch self {
            case .file: return "arrow.up.doc"
            case .youtube: return "youtube"
            case .googleDrive: return "googleDrive"
            case .dropbox: return "dropbox"
            }
        }
        
        var isSystemIcon: Bool {
            switch self {
            case .file: return true
            case .youtube, .googleDrive, .dropbox: return false
            }
        }
        
        var tintColor: Color? {
            switch self {
            case .file: return .noteablyPrimary
            default: return nil
            }
        }
    }

    // Navigation and state
    var uploadMode: UploadMode = .file {
        didSet {
            if oldValue != uploadMode {
                errorMessage = nil
            }
        }
    }

    // File selection
    var selectedFileData: Data?
    var selectedFileName: String?
    var selectedMimeType: String?

    // YouTube support
    var youtubeUrl: String = ""
    var videoMeta: YoutubeMeta?
    var isFetchingMeta = false

    // Cloud support
    var cloudFileId: String?
    var cloudFileLink: String?
    var selectedCloudFileName: String?

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
    var navigateToJobId: String? = nil
    
    // Custom options
    var jobOptions = JobOptions(
        focus: "general",
        language: "english",
        notesStyle: "standard",
        summaryLength: "medium",
        quizDifficulty: "medium",
        difficulty: "medium"
    )

    private let jobsService = JobsService.shared
    private var wsService: WebSocketService?

    var hasFile: Bool { selectedFileData != nil }
    
    var hasValidYoutube: Bool { videoMeta != nil }

    var selectedMaterialTypes: [String] {
        var types: [String] = []
        if generateSummary { types.append("summary") }
        if generateNotes { types.append("notes") }
        if generateFlashcards { types.append("flashcards") }
        if generateQuiz { types.append("quiz") }
        return types
    }

    var hasCloudFile: Bool {
        if uploadMode == .googleDrive { return cloudFileId != nil }
        if uploadMode == .dropbox { return cloudFileLink != nil }
        return false
    }

    var canUpload: Bool {
        let hasSource: Bool
        switch uploadMode {
        case .file: hasSource = hasFile
        case .youtube: hasSource = hasValidYoutube
        case .googleDrive, .dropbox: hasSource = hasCloudFile
        }
        return hasSource && !selectedMaterialTypes.isEmpty && !isUploading
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
    
    func selectCloudFile(id: String?, link: String?, name: String, provider: CloudProvider) {
        self.cloudFileId = id
        self.cloudFileLink = link
        self.selectedCloudFileName = name
        self.uploadMode = provider == .googleDrive ? .googleDrive : .dropbox
        self.errorMessage = nil
    }

    // MARK: - Upload

    func upload() async {
        isUploading = true
        errorMessage = nil
        isComplete = false

        do {
            let response: ProcessUploadResponse
            
            if uploadMode == .file {
                guard let data = selectedFileData,
                      let name = selectedFileName,
                      let mime = selectedMimeType else { 
                    isUploading = false
                    return 
                }
                
                response = try await jobsService.processUpload(
                    fileData: data,
                    fileName: name,
                    mimeType: mime,
                    materialTypes: selectedMaterialTypes,
                    options: jobOptions
                )
            } else if uploadMode == .youtube {
                guard !youtubeUrl.isEmpty else {
                    isUploading = false
                    return
                }
                
                response = try await jobsService.processYoutube(
                    url: youtubeUrl,
                    materialTypes: selectedMaterialTypes,
                    options: jobOptions
                )
            } else {
                // Cloud Import
                let params = CloudImportParams(
                    provider: uploadMode == .googleDrive ? "google_drive" : "dropbox",
                    fileId: cloudFileId,
                    fileLink: cloudFileLink,
                    materialTypes: selectedMaterialTypes,
                    options: jobOptions
                )
                response = try await CloudService.shared.importFromCloud(params: params)
            }
            
            uploadedJobId = response.jobId
            jobStatus = JobStatus(rawValue: response.status)

            // Start WebSocket listening
            setupWebSocket()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            isUploading = false
        } catch {
            errorMessage = error.localizedDescription
            isUploading = false
        }
    }

    private func setupWebSocket() {
        if wsService == nil {
            wsService = WebSocketService(baseURL: APIClient.shared.baseURL)
            wsService?.onJobUpdate = { [weak self] update in
                self?.handleJobUpdate(update)
            }
        }
        
        Task {
            if let token = await AuthService.shared.getAccessToken() {
                wsService?.connect(token: token)
            }
        }
    }

    // MARK: - YouTube Helper

    func fetchYoutubeMeta() async {
        guard !youtubeUrl.isEmpty else {
            videoMeta = nil
            return
        }
        
        // Basic validation before calling API
        guard youtubeUrl.contains("youtube.com") || youtubeUrl.contains("youtu.be") else {
            videoMeta = nil
            return
        }

        isFetchingMeta = true
        errorMessage = nil
        
        do {
            videoMeta = try await jobsService.getYoutubeMeta(url: youtubeUrl)
        } catch {
            videoMeta = nil
            if youtubeUrl.count > 10 {
                errorMessage = "Could not fetch video details. Check the URL or API configuration."
            }
        }
        
        isFetchingMeta = false
    }

    // MARK: - WebSocket Update Handler

    func handleJobUpdate(_ update: WebSocketJobUpdate) {
        guard update.jobId == uploadedJobId else { return }

        if let status = JobStatus(rawValue: update.status) {
            jobStatus = status
            if status == .completed {
                isComplete = true
                isUploading = false
                navigateToJobId = update.jobId
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
        youtubeUrl = ""
        videoMeta = nil
        isFetchingMeta = false
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
        navigateToJobId = nil
        cloudFileId = nil
        cloudFileLink = nil
        selectedCloudFileName = nil
        jobOptions = JobOptions(
            focus: "general",
            language: "english",
            notesStyle: "standard",
            summaryLength: "medium",
            quizDifficulty: "medium",
            difficulty: "medium"
        )
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

// MARK: - Processing Step

struct ProcessingStep: Identifiable {
    let id: String
    let title: String
    let description: String
}

extension UploadViewModel {
    var steps: [ProcessingStep] {
        var s: [ProcessingStep] = []

        if uploadMode == .youtube {
            s.append(ProcessingStep(id: "checking_video", title: "Checking Video", description: "Validating YouTube URL..."))
            s.append(ProcessingStep(id: "downloading", title: "Downloading Audio", description: "Extracting audio track..."))
        } else if uploadMode == .googleDrive || uploadMode == .dropbox {
            s.append(ProcessingStep(id: "importing", title: "Importing", description: "Fetching file from cloud..."))
        } else {
            s.append(ProcessingStep(id: "uploading", title: "Uploading File", description: "Securely transferring your data..."))
        }

        // Determine content type
        let isAudioVideo: Bool
        let isPdf: Bool

        if uploadMode == .youtube {
            isAudioVideo = true
            isPdf = false
        } else {
            if let mime = selectedMimeType {
                 isAudioVideo = mime.contains("audio") || mime.contains("video")
                 isPdf = mime.contains("pdf")
            } else {
                isAudioVideo = false
                isPdf = false
            }
        }

        if isAudioVideo {
             s.append(ProcessingStep(id: "transcribing", title: "Transcribing Audio", description: "Converting speech to text..."))
        } else if isPdf {
             s.append(ProcessingStep(id: "extracting_text", title: "Extracting Text", description: "Parsing PDF content..."))
        }

        if !selectedMaterialTypes.isEmpty {
            s.append(ProcessingStep(id: "generating", title: "Generating Materials", description: "Creating your study set..."))
        }

        s.append(ProcessingStep(id: "finalizing", title: "Finalizing", description: "Preparing your study guide..."))

        return s
    }
    
    var currentStepIndex: Int {
        guard let status = jobStatus else { return 0 }
        
        if status == .completed { return steps.count - 1 }
        
        // Find index where step.id == status.rawValue
        if let index = steps.firstIndex(where: { $0.id == status.rawValue }) {
            return index
        }
        
        // Fallbacks
        if status == .queued {
            // Find transcribing or extracting
             if let index = steps.firstIndex(where: { $0.id == "transcribing" || $0.id == "extracting_text" }) {
                return index
             }
             return 1
        }
        
        if status.rawValue.starts(with: "generating") {
            if let index = steps.firstIndex(where: { $0.id == "generating" }) {
                return index
            }
        }
        
        return 0
    }
}
