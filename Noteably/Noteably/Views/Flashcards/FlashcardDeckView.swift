import SwiftUI

struct FlashcardDeckView: View {
    @State private var viewModel: FlashcardViewModel
    @State private var dragOffset: CGFloat = 0

    init(flashcards: [Flashcard]) {
        _viewModel = State(initialValue: FlashcardViewModel(flashcards: flashcards))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Progress
            VStack(spacing: 8) {
                ProgressView(value: viewModel.progressFraction)
                    .tint(Color.noteablyPrimary)

                HStack {
                    Text("Card \(viewModel.currentNumber) of \(viewModel.totalCards)")
                        .font(.noteablyBody(14, weight: .medium))
                        .foregroundStyle(Color.noteablySecondaryText)
                    Spacer()
                    Button {
                        viewModel.toggleShuffle()
                    } label: {
                        Image(systemName: viewModel.isShuffled ? "shuffle.circle.fill" : "shuffle")
                            .font(.system(size: 20))
                            .foregroundStyle(
                                viewModel.isShuffled ? Color.noteablyPrimary : Color.noteablySecondaryText
                            )
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Spacer()

            // Card
            if let card = viewModel.currentCard {
                cardView(card)
                    .offset(x: dragOffset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                dragOffset = value.translation.width
                            }
                            .onEnded { value in
                                let threshold: CGFloat = 80
                                withAnimation(.spring(response: 0.3)) {
                                    if value.translation.width > threshold {
                                        viewModel.previous()
                                    } else if value.translation.width < -threshold {
                                        viewModel.next()
                                    }
                                    dragOffset = 0
                                }
                            }
                    )
                    .animation(.spring(response: 0.3), value: viewModel.currentIndex)
            }

            Spacer()

            // Navigation
            HStack(spacing: 40) {
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        viewModel.previous()
                    }
                } label: {
                    Image(systemName: "arrow.left.circle.fill")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(
                            viewModel.canGoBack ? Color.noteablyPrimary : Color.noteablyBorder
                        )
                }
                .disabled(!viewModel.canGoBack)

                Button {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        viewModel.flip()
                    }
                } label: {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 32, weight: .medium))
                        .foregroundStyle(Color.noteablySecondaryText)
                }

                Button {
                    withAnimation(.spring(response: 0.3)) {
                        viewModel.next()
                    }
                } label: {
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(
                            viewModel.canGoForward ? Color.noteablyPrimary : Color.noteablyBorder
                        )
                }
                .disabled(!viewModel.canGoForward)
            }
            .padding(.bottom, 32)
        }
        .padding(.bottom, 64)
        .background(Color.noteablyBackground)
        .navigationTitle("Study")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Card View

    private func cardView(_ card: Flashcard) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(viewModel.isFlipped ? Color.noteablyPrimary : Color.noteablyCard)
                .shadow(color: Color.black.opacity(0.06), radius: 16, y: 6)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(
                            viewModel.isFlipped ? Color.white.opacity(0.2) : Color.noteablyBorder.opacity(0.3),
                            lineWidth: 1
                        )
                )

            VStack(spacing: 16) {
                Text(viewModel.isFlipped ? "Answer" : "Question")
                    .font(.noteablyBody(12, weight: .semibold))
                    .foregroundStyle(viewModel.isFlipped ? Color.white.opacity(0.8) : Color.noteablySecondaryText)
                    .textCase(.uppercase)
                    .tracking(1)

                Text(viewModel.isFlipped ? card.back : card.front)
                    .font(.noteablyBody(viewModel.isFlipped ? 17 : 20, weight: .medium))
                    .foregroundStyle(viewModel.isFlipped ? Color.white : Color.noteablyForeground)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 24)
            }
        }
        .frame(height: 280)
        .padding(.horizontal, 24)
        .onTapGesture {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                viewModel.flip()
            }
        }
        .rotation3DEffect(
            .degrees(viewModel.isFlipped ? 180 : 0),
            axis: (x: 0, y: 1, z: 0),
            perspective: 0.5
        )
        .scaleEffect(x: viewModel.isFlipped ? -1 : 1, y: 1, anchor: .center)
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        FlashcardDeckView(flashcards: MockData.jobFlashcards.flashcards)
    }
}
#endif
