import Foundation

// MARK: - Content Response

struct ContentResponse: Codable {
    let jobId: String
    let status: String
    let content: ContentData

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case status, content
    }
}

// MARK: - Content Data (all material types)

struct ContentData: Codable {
    let summary: SummaryContent?
    let notes: NotesContent?
    let flashcards: FlashcardsContent?
    let quiz: QuizContent?
}

// MARK: - Summary

struct SummaryContent: Codable {
    let title: String
    let summary: String
    let keyPoints: [String]

    enum CodingKeys: String, CodingKey {
        case title, summary
        case keyPoints = "key_points"
    }
}

// MARK: - Notes

struct NotesContent: Codable {
    let content: String
}

// MARK: - Flashcards

struct FlashcardsContent: Codable {
    let flashcards: [Flashcard]
}

struct Flashcard: Codable, Identifiable {
    let front: String
    let back: String

    var id: String { front }
}

// MARK: - Quiz

struct QuizContent: Codable {
    let questions: [QuizQuestion]
}

struct QuizQuestion: Codable, Identifiable {
    let question: String
    let options: [String]
    let correctOption: Int
    let explanation: String

    var id: String { question }

    enum CodingKeys: String, CodingKey {
        case question, options
        case correctOption = "correct_option"
        case explanation
    }
}

// MARK: - Quiz Attempt

struct QuizAttempt: Codable, Identifiable {
    let id: String
    let job: String
    let score: Int
    let totalQuestions: Int
    let percentage: Double
    let answers: [QuizAnswer]
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, job, score
        case totalQuestions = "total_questions"
        case percentage, answers
        case createdAt = "created_at"
    }
}

struct QuizAnswer: Codable {
    let questionIndex: Int
    let selectedOption: Int
    let isCorrect: Bool

    enum CodingKeys: String, CodingKey {
        case questionIndex = "question_index"
        case selectedOption = "selected_option"
        case isCorrect = "is_correct"
    }
}

// MARK: - Create Attempt Request

struct CreateAttemptRequest: Codable {
    let score: Int
    let totalQuestions: Int
    let answers: [QuizAnswer]

    enum CodingKeys: String, CodingKey {
        case score
        case totalQuestions = "total_questions"
        case answers
    }
}

// MARK: - Export

struct ExportRequest: Codable {
    let jobId: String
    let format: String
    let materialTypes: [String]
    let options: ExportOptions?

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case format
        case materialTypes = "material_types"
        case options
    }
}

struct ExportOptions: Codable {
    var includeTranscript: Bool?
    var includeMetadata: Bool?

    enum CodingKeys: String, CodingKey {
        case includeTranscript = "include_transcript"
        case includeMetadata = "include_metadata"
    }
}

struct ExportResponse: Codable {
    let downloadUrl: String
    let fileName: String
    let fileSize: Int
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case downloadUrl = "download_url"
        case fileName = "file_name"
        case fileSize = "file_size"
        case expiresAt = "expires_at"
    }
}
