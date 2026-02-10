import Foundation

// MARK: - Quiz Service

final class QuizService {
    static let shared = QuizService()
    private let api = APIClient.shared

    private init() {}

    // MARK: - Get Attempts

    func getAttempts(jobId: String) async throws -> PaginatedResponse<QuizAttempt> {
        try await api.get(path: "/api/quizzes/\(jobId)/attempts/")
    }

    // MARK: - Save Attempt

    func saveAttempt(jobId: String, score: Int, totalQuestions: Int, answers: [QuizAnswer]) async throws -> QuizAttempt {
        let request = CreateAttemptRequest(
            score: score,
            totalQuestions: totalQuestions,
            answers: answers
        )
        return try await api.post(path: "/api/quizzes/\(jobId)/attempts/", body: request)
    }
}
