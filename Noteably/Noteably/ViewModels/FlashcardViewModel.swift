import Foundation

@Observable
final class FlashcardViewModel {
    let flashcards: [Flashcard]

    var currentIndex = 0
    var isFlipped = false
    var isShuffled = false
    private var shuffledIndices: [Int] = []

    init(flashcards: [Flashcard]) {
        self.flashcards = flashcards
        self.shuffledIndices = Array(flashcards.indices)
    }

    var currentCard: Flashcard? {
        guard !flashcards.isEmpty else { return nil }
        let index = isShuffled ? shuffledIndices[currentIndex] : currentIndex
        return flashcards[index]
    }

    var totalCards: Int { flashcards.count }
    var currentNumber: Int { currentIndex + 1 }
    var progressFraction: Double {
        guard totalCards > 0 else { return 0 }
        return Double(currentNumber) / Double(totalCards)
    }

    var canGoBack: Bool { currentIndex > 0 }
    var canGoForward: Bool { currentIndex < totalCards - 1 }

    func flip() {
        isFlipped.toggle()
    }

    func next() {
        guard canGoForward else { return }
        currentIndex += 1
        isFlipped = false
    }

    func previous() {
        guard canGoBack else { return }
        currentIndex -= 1
        isFlipped = false
    }

    func toggleShuffle() {
        isShuffled.toggle()
        if isShuffled {
            shuffledIndices = Array(flashcards.indices).shuffled()
        }
        currentIndex = 0
        isFlipped = false
    }

    func reset() {
        currentIndex = 0
        isFlipped = false
    }
}
