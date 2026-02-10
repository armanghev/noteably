import Foundation

@Observable
final class StudySetDetailViewModel {
    let jobId: String

    var job: Job?
    var content: ContentResponse?
    var isLoading = false
    var errorMessage: String?

    private let jobsService = JobsService.shared
    private let contentService = ContentService.shared

    init(jobId: String, job: Job? = nil, content: ContentResponse? = nil) {
        self.jobId = jobId
        self.job = job
        self.content = content
        
        if content == nil {
            // Load cached content if not provided
            self.content = contentService.cachedContent(jobId: jobId)
        }
    }

    var summary: SummaryContent? { content?.content.summary }
    var notes: NotesContent? { content?.content.notes }
    var flashcards: [Flashcard] { content?.content.flashcards?.flashcards ?? [] }
    var quiz: QuizContent? { content?.content.quiz }
    var hasFlashcards: Bool { !flashcards.isEmpty }
    var hasQuiz: Bool { quiz != nil && !(quiz?.questions.isEmpty ?? true) }

    func loadAll() async {
        isLoading = content == nil
        errorMessage = nil

        do {
            async let jobResult = jobsService.getJob(id: jobId)
            async let contentResult = contentService.getContent(jobId: jobId)

            job = try await jobResult
            content = try await contentResult
        } catch let error as APIError {
            if content == nil { errorMessage = error.errorDescription }
        } catch {
            if content == nil { errorMessage = error.localizedDescription }
        }

        isLoading = false
    }

    func deleteJob() async -> Bool {
        do {
            _ = try await jobsService.deleteJob(id: jobId)
            return true
        } catch {
            errorMessage = "Failed to delete."
            return false
        }
    }
}
