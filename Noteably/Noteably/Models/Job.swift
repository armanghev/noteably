import Foundation

// MARK: - Job Status

enum JobStatus: String, Codable, CaseIterable {
    case checkingVideo = "checking_video"
    case downloading
    case uploading
    case queued
    case transcribing
    case extractingText = "extracting_text"
    case generatingSummary = "generating_summary"
    case generatingNotes = "generating_notes"
    case generatingFlashcards = "generating_flashcards"
    case generatingQuiz = "generating_quiz"
    case generating
    case completed
    case failed
    case cancelled

    var displayName: String {
        switch self {
        case .checkingVideo: return "Checking Video"
        case .downloading: return "Downloading"
        case .uploading: return "Uploading"
        case .queued: return "Queued"
        case .transcribing: return "Transcribing"
        case .extractingText: return "Extracting Text"
        case .generatingSummary: return "Generating Summary"
        case .generatingNotes: return "Generating Notes"
        case .generatingFlashcards: return "Generating Flashcards"
        case .generatingQuiz: return "Generating Quiz"
        case .generating: return "Generating"
        case .completed: return "Completed"
        case .failed: return "Failed"
        case .cancelled: return "Cancelled"
        }
    }

    var isProcessing: Bool {
        switch self {
        case .checkingVideo, .downloading, .uploading, .queued, .transcribing, .extractingText,
             .generatingSummary, .generatingNotes, .generatingFlashcards,
             .generatingQuiz, .generating:
            return true
        case .completed, .failed, .cancelled:
            return false
        }
    }
}

// MARK: - Job Options

struct JobOptions: Codable {
    var summaryLength: String?
    var flashcardCount: Int?
    var quizQuestionCount: Int?
    var difficulty: String?

    enum CodingKeys: String, CodingKey {
        case summaryLength = "summary_length"
        case flashcardCount = "flashcard_count"
        case quizQuestionCount = "quiz_question_count"
        case difficulty
    }
}

// MARK: - Transcription Word

struct TranscriptionWord: Codable {
    let text: String
    let start: Double
    let end: Double
    let confidence: Double
}

// MARK: - Job (Full Detail)

struct Job: Codable, Identifiable {
    let id: String
    let userId: String
    let filename: String
    let fileSizeBytes: Int?
    let fileType: String
    let storageUrl: String?
    let materialTypes: [String]
    let options: JobOptions?
    let status: JobStatus
    let transcriptionText: String?
    let transcriptionWords: [TranscriptionWord]?
    let progress: Int
    let currentStep: String?
    let errorMessage: String?
    let createdAt: String
    let startedAt: String?
    let completedAt: String?
    let generatedContent: [GeneratedContentItem]?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case filename
        case fileSizeBytes = "file_size_bytes"
        case fileType = "file_type"
        case storageUrl = "storage_url"
        case materialTypes = "material_types"
        case options, status
        case transcriptionText = "transcription_text"
        case transcriptionWords = "transcription_words"
        case progress
        case currentStep = "current_step"
        case errorMessage = "error_message"
        case createdAt = "created_at"
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case generatedContent = "generated_content"
    }
}

// MARK: - Job List Item (lighter response)

struct JobListItem: Codable, Identifiable {
    let id: String
    let filename: String
    let fileType: String
    let status: JobStatus
    let progress: Int
    let currentStep: String?
    let errorMessage: String?
    let createdAt: String
    let completedAt: String?
    let flashcardCount: Int?
    let quizCount: Int?
    let contentTypes: [String]?
    let summaryTitle: String?
    let summaryPreview: String?

    enum CodingKeys: String, CodingKey {
        case id, filename
        case fileType = "file_type"
        case status, progress
        case currentStep = "current_step"
        case errorMessage = "error_message"
        case createdAt = "created_at"
        case completedAt = "completed_at"
        case flashcardCount = "flashcard_count"
        case quizCount = "quiz_count"
        case contentTypes = "content_types"
        case summaryTitle = "summary_title"
        case summaryPreview = "summary_preview"
    }
}

// MARK: - Paginated Response

struct PaginatedResponse<T: Codable>: Codable {
    let next: String?
    let previous: String?
    let results: [T]
}

// MARK: - Generated Content Item

struct GeneratedContentItem: Codable, Identifiable {
    let id: Int
    let type: String
    let content: AnyCodableValue
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, type, content
        case createdAt = "created_at"
    }
}

// MARK: - Process Upload Response

struct ProcessUploadResponse: Codable {
    let jobId: String
    let status: String
    let estimatedTime: Int?

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case status
        case estimatedTime = "estimated_time"
    }
}

// MARK: - Process YouTube Request

struct ProcessYoutubeRequest: Encodable {
    let url: String
    let materialTypes: [String]
    let options: JobOptions?

    enum CodingKeys: String, CodingKey {
        case url
        case materialTypes = "material_types"
        case options
    }
}

// MARK: - Signed URL Response

struct SignedURLResponse: Codable {
    let signedUrl: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case signedUrl = "signed_url"
        case expiresIn = "expires_in"
    }
}

// MARK: - Job Action Responses

struct JobActionResponse: Codable {
    let message: String?
    let jobId: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case message
        case jobId = "job_id"
        case status
    }
}

// MARK: - YouTube Meta

struct YoutubeMeta: Codable {
    let title: String
    let author: String
    let duration: Int
    let thumbnail: String
}

// MARK: - Flexible JSON Value (for content field)

enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case dictionary([String: AnyCodableValue])
    case array([AnyCodableValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
            return
        }
        if let value = try? container.decode(Bool.self) {
            self = .bool(value)
            return
        }
        if let value = try? container.decode(Int.self) {
            self = .int(value)
            return
        }
        if let value = try? container.decode(Double.self) {
            self = .double(value)
            return
        }
        if let value = try? container.decode(String.self) {
            self = .string(value)
            return
        }
        if let value = try? container.decode([String: AnyCodableValue].self) {
            self = .dictionary(value)
            return
        }
        if let value = try? container.decode([AnyCodableValue].self) {
            self = .array(value)
            return
        }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode AnyCodableValue")
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .double(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .dictionary(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}
