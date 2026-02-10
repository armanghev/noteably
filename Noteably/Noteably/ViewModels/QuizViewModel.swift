import Foundation

@Observable
final class QuizViewModel {
    let jobId: String
    let questions: [QuizQuestion]

    var currentIndex = 0
    var selectedOption: Int?
    var hasAnswered = false
    var answers: [QuizAnswer] = []
    var isComplete = false
    var isSaving = false
    var savedAttempt: QuizAttempt?

    private let quizService = QuizService.shared

    init(jobId: String, questions: [QuizQuestion]) {
        self.jobId = jobId
        self.questions = questions
    }

    var currentQuestion: QuizQuestion? {
        guard currentIndex < questions.count else { return nil }
        return questions[currentIndex]
    }

    var totalQuestions: Int { questions.count }
    var currentNumber: Int { currentIndex + 1 }
    var progressFraction: Double {
        guard totalQuestions > 0 else { return 0 }
        return Double(currentNumber) / Double(totalQuestions)
    }

    var score: Int { answers.filter(\.isCorrect).count }
    var percentage: Double {
        guard totalQuestions > 0 else { return 0 }
        return (Double(score) / Double(totalQuestions)) * 100
    }

    var isCorrectAnswer: Bool? {
        guard hasAnswered, let selected = selectedOption else { return nil }
        return selected == currentQuestion?.correctOption
    }

    // MARK: - Actions

    func selectAnswer(_ optionIndex: Int) {
        guard !hasAnswered else { return }
        selectedOption = optionIndex
        hasAnswered = true

        let isCorrect = optionIndex == currentQuestion?.correctOption
        answers.append(QuizAnswer(
            questionIndex: currentIndex,
            selectedOption: optionIndex,
            isCorrect: isCorrect
        ))
    }

    func nextQuestion() {
        guard currentIndex < questions.count - 1 else {
            isComplete = true
            return
        }
        currentIndex += 1
        selectedOption = nil
        hasAnswered = false
    }

    func saveAttempt() async {
        isSaving = true
        do {
            savedAttempt = try await quizService.saveAttempt(
                jobId: jobId,
                score: score,
                totalQuestions: totalQuestions,
                answers: answers
            )
        } catch {
            // Attempt save failed — could queue for offline sync
        }
        isSaving = false
    }

    func reset() {
        currentIndex = 0
        selectedOption = nil
        hasAnswered = false
        answers = []
        isComplete = false
        savedAttempt = nil
    }
}
