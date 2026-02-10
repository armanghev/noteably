import SwiftUI

// MARK: - Progress Step Indicator

struct ProgressStepIndicator: View {
    let steps: [String]
    let currentStepIndex: Int

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(spacing: 14) {
                    // Step circle
                    ZStack {
                        if index < currentStepIndex {
                            Circle()
                                .fill(Color.noteablyPrimary)
                                .frame(width: 28, height: 28)
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        } else if index == currentStepIndex {
                            Circle()
                                .fill(Color.noteablyPrimary)
                                .frame(width: 28, height: 28)
                            ProgressView()
                                .scaleEffect(0.6)
                                .tint(.white)
                        } else {
                            Circle()
                                .stroke(Color.noteablyBorder, lineWidth: 2)
                                .frame(width: 28, height: 28)
                        }
                    }

                    Text(step)
                        .font(.noteablyBody(14, weight: index <= currentStepIndex ? .medium : .regular))
                        .foregroundStyle(index <= currentStepIndex ? Color.noteablyForeground : Color.noteablySecondaryText)

                    Spacer()
                }

                // Connector line
                if index < steps.count - 1 {
                    HStack {
                        Rectangle()
                            .fill(index < currentStepIndex ? Color.noteablyPrimary : Color.noteablyBorder)
                            .frame(width: 2, height: 24)
                            .padding(.leading, 13)
                        Spacer()
                    }
                }
            }
        }
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(Color.noteablySecondaryText.opacity(0.5))

            Text(title)
                .font(.noteablySerif(22, weight: .semibold))
                .foregroundStyle(Color.noteablyForeground)

            Text(message)
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)
                .multilineTextAlignment(.center)
                .lineSpacing(2)
                .padding(.horizontal, 32)

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .padding(.horizontal, 60)
                .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Offline Indicator

struct OfflineIndicator: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 12, weight: .medium))
            Text("Offline")
                .font(.noteablyBody(12, weight: .medium))
        }
        .foregroundStyle(Color.noteablySecondaryText)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.noteablyInputBackground)
        )
    }
}

// MARK: - Material Type Toggle

struct MaterialTypeToggle: View {
    let type: String
    let icon: String
    @Binding var isSelected: Bool

    var body: some View {
        Button {
            isSelected.toggle()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                Text(type)
                    .font(.noteablyBody(14, weight: .medium))
            }
            .foregroundStyle(isSelected ? .white : Color.noteablyForeground)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(isSelected ? Color.noteablyPrimary : Color.noteablyCard)
            )
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Color.noteablyBorder, lineWidth: 1)
            )
        }
        .animation(.easeOut(duration: 0.15), value: isSelected)
    }
}

// MARK: - Search Bar

struct NoteablySearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search..."

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)

            TextField(placeholder, text: $text)
                .font(.noteablyBody(16))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.noteablyInputBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.noteablyBorder, lineWidth: 1)
        )
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)

            Text(value)
                .font(.noteablySerif(28, weight: .bold))
                .foregroundStyle(Color.noteablyForeground)

            Text(title)
                .font(.noteablyBody(12, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }
}

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 30) {
            ProgressStepIndicator(steps: ["Upload", "Processing", "Done"], currentStepIndex: 1)
            
            EmptyStateView(
                icon: "doc.text",
                title: "Empty State",
                message: "This is what an empty state looks like."
            )
            
            OfflineIndicator()
            
            HStack {
                MaterialTypeToggle(type: "Selected", icon: "checkmark", isSelected: .constant(true))
                MaterialTypeToggle(type: "Unselected", icon: "xmark", isSelected: .constant(false))
            }
            
            NoteablySearchBar(text: .constant("Search query"))
            
            StatCard(title: "Statistics", value: "100%", icon: "chart.bar")
        }
        .padding()
    }
    .background(Color.noteablyBackground)
}
#endif
