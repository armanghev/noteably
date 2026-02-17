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

    // Backend may return quiz under "quiz" or "quizzes" key depending on how the job was created
    enum CodingKeys: String, CodingKey {
        case summary, notes, flashcards
        case quiz
        case quizzes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        summary = try container.decodeIfPresent(SummaryContent.self, forKey: .summary)
        notes = try container.decodeIfPresent(NotesContent.self, forKey: .notes)
        flashcards = try container.decodeIfPresent(FlashcardsContent.self, forKey: .flashcards)
        // Try "quiz" first, fall back to "quizzes"
        quiz = try container.decodeIfPresent(QuizContent.self, forKey: .quiz)
            ?? container.decodeIfPresent(QuizContent.self, forKey: .quizzes)
    }

    init(summary: SummaryContent? = nil, notes: NotesContent? = nil, flashcards: FlashcardsContent? = nil, quiz: QuizContent? = nil) {
        self.summary = summary
        self.notes = notes
        self.flashcards = flashcards
        self.quiz = quiz
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(summary, forKey: .summary)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(flashcards, forKey: .flashcards)
        try container.encodeIfPresent(quiz, forKey: .quiz)
    }
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
    let content: String?
    let cornell: CornellData?
    let qa: [QAData]?
    let outline: OutlineData?
}

struct CornellData: Codable {
    let cues: [String]
    let notes: [String]
}

struct QAData: Codable, Identifiable {
    let question: String
    let answer: String

    var id: String { question }
}

struct OutlineData: Codable {
    let title: String
    let children: [OutlineNode]
}

struct OutlineNode: Codable, Identifiable {
    let bullet: String
    let children: [OutlineNode]

    var id: String { bullet }
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
