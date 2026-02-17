import SwiftUI

struct QuizDetailView: View {
    @State private var viewModel: QuizViewModel
    @Environment(\.dismiss) private var dismiss

    init(jobId: String, questions: [QuizQuestion]) {
        _viewModel = State(initialValue: QuizViewModel(jobId: jobId, questions: questions))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isComplete {
                resultsView
            } else {
                questionView
            }
        }
        .padding(.bottom, 64)
        .background(Color.noteablyBackground)
        .navigationTitle("Quiz")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Question View

    private var questionView: some View {
        VStack(spacing: 0) {
            // Progress
            VStack(spacing: 8) {
                ProgressView(value: viewModel.progressFraction)
                    .tint(Color.noteablyPrimary)

                Text("Question \(viewModel.currentNumber) of \(viewModel.totalQuestions)")
                    .font(.noteablyBody(14, weight: .medium))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            ScrollView(showsIndicators: false) {
                if let question = viewModel.currentQuestion {
                    VStack(alignment: .leading, spacing: 24) {
                        // Question text
                        Text(question.question)
                            .font(.noteablySerif(14, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineSpacing(4)
                            .padding(.top, 24)

                        // Options
                        VStack(spacing: 10) {
                            ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                                optionButton(index: index, text: option, question: question)
                            }
                        }

                        // Feedback
                        if viewModel.hasAnswered {
                            feedbackSection(question: question)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)
                }
            }

            // Next button
            if viewModel.hasAnswered {
                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        viewModel.nextQuestion()
                    }
                } label: {
                    Text(viewModel.currentIndex < viewModel.totalQuestions - 1 ? "Next Question" : "See Results")
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
        }
    }

    private func optionButton(index: Int, text: String, question: QuizQuestion) -> some View {
        Button {
            withAnimation(.easeOut(duration: 0.2)) {
                viewModel.selectAnswer(index)
            }
        } label: {
            HStack(spacing: 14) {
                // Letter badge
                Text(String(Character(UnicodeScalar(65 + index)!)))
                    .font(.noteablyBody(14, weight: .bold))
                    .foregroundStyle(badgeForeground(index: index, question: question))
                    .frame(width: 32, height: 32)
                    .background(
                        Circle()
                            .fill(badgeBackground(index: index, question: question))
                    )

                Text(text)
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablyForeground)
                    .multilineTextAlignment(.leading)

                Spacer()

                if viewModel.hasAnswered {
                    if index == question.correctOption {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color.noteablyPrimary)
                    } else if index == viewModel.selectedOption {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.noteablyDestructive)
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .fill(optionBackground(index: index, question: question))
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .stroke(optionBorder(index: index, question: question), lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .disabled(viewModel.hasAnswered)
    }

    private func badgeForeground(index: Int, question: QuizQuestion) -> Color {
        guard viewModel.hasAnswered else {
            return index == viewModel.selectedOption ? .white : Color.noteablySecondaryText
        }
        if index == question.correctOption { return .white }
        if index == viewModel.selectedOption { return .white }
        return Color.noteablySecondaryText
    }

    private func badgeBackground(index: Int, question: QuizQuestion) -> Color {
        guard viewModel.hasAnswered else {
            return index == viewModel.selectedOption ? Color.noteablyPrimary : Color.noteablyInputBackground
        }
        if index == question.correctOption { return Color.noteablyPrimary }
        if index == viewModel.selectedOption { return Color.noteablyDestructive }
        return Color.noteablyInputBackground
    }

    private func optionBackground(index: Int, question: QuizQuestion) -> Color {
        guard viewModel.hasAnswered else { return Color.noteablyCard }
        if index == question.correctOption { return Color.noteablyPrimary.opacity(0.06) }
        if index == viewModel.selectedOption { return Color.noteablyDestructive.opacity(0.06) }
        return Color.noteablyCard
    }

    private func optionBorder(index: Int, question: QuizQuestion) -> Color {
        guard viewModel.hasAnswered else {
            return Color.noteablyBorder.opacity(0.4)
        }
        if index == question.correctOption { return Color.noteablyPrimary.opacity(0.3) }
        if index == viewModel.selectedOption { return Color.noteablyDestructive.opacity(0.3) }
        return Color.noteablyBorder.opacity(0.4)
    }

    private func feedbackSection(question: QuizQuestion) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: viewModel.isCorrectAnswer == true ? "checkmark.circle.fill" : "xmark.circle.fill")
                Text(viewModel.isCorrectAnswer == true ? "Correct!" : "Incorrect")
                    .font(.noteablyBody(15, weight: .semibold))
            }
            .foregroundStyle(viewModel.isCorrectAnswer == true ? Color.noteablyPrimary : Color.noteablyDestructive)

            Text(question.explanation)
                .font(.noteablyBody(14))
                .foregroundStyle(Color.noteablySecondaryText)
                .lineSpacing(2)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                .fill(Color.noteablyCardElevated)
        )
    }

    // MARK: - Results View

    private var resultsView: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 28) {
                Spacer().frame(height: 32)

                // Score circle
                ZStack {
                    Circle()
                        .stroke(Color.noteablyBorder, lineWidth: 8)
                        .frame(width: 140, height: 140)

                    Circle()
                        .trim(from: 0, to: viewModel.percentage / 100)
                        .stroke(scoreColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 140, height: 140)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 2) {
                        Text("\(Int(viewModel.percentage))%")
                            .font(.noteablySerif(36, weight: .bold))
                            .foregroundStyle(Color.noteablyForeground)
                        Text("\(viewModel.score)/\(viewModel.totalQuestions)")
                            .font(.noteablyBody(14))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                }

                Text(scoreMessage)
                    .font(.noteablySerif(22, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                // Actions
                VStack(spacing: 12) {
                    Button {
                        viewModel.reset()
                    } label: {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Retake Quiz")
                        }
                    }
                    .buttonStyle(NoteablyPrimaryButtonStyle())

                    Button {
                        dismiss()
                    } label: {
                        Text("Done")
                    }
                    .buttonStyle(NoteablySecondaryButtonStyle())
                }
                .padding(.horizontal, 20)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .task {
            await viewModel.saveAttempt()
        }
    }

    private var scoreColor: Color {
        if viewModel.percentage >= 80 { return Color.noteablyPrimary }
        if viewModel.percentage >= 50 { return Color.noteablyAmber }
        return Color.noteablyDestructive
    }

    private var scoreMessage: String {
        if viewModel.percentage >= 90 { return "Excellent!" }
        if viewModel.percentage >= 70 { return "Great job!" }
        if viewModel.percentage >= 50 { return "Good effort!" }
        return "Keep studying!"
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        QuizDetailView(
            jobId: "mock-job-id",
            questions: MockData.jobQuiz.questions
        )
    }
}
#endif
