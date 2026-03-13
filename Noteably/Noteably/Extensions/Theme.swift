import SwiftUI

// MARK: - Adaptive Color Helper

private func adaptiveColor(light: Color, dark: Color) -> Color {
    Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(dark)
            : UIColor(light)
    })
}

// MARK: - Noteably Color Palette

extension Color {
    // Sage green primary - matches web app oklch(0.4561 0.0462 144.7706)
    static let noteablyPrimary = adaptiveColor(
        light: Color(red: 0.373, green: 0.498, blue: 0.349),
        dark: Color(red: 0.478, green: 0.608, blue: 0.451)
    )

    // Slightly brighter accent green
    static let noteablyAccent = adaptiveColor(
        light: Color(red: 0.427, green: 0.561, blue: 0.400),
        dark: Color(red: 0.529, green: 0.659, blue: 0.498)
    )

    // Backgrounds
    static let noteablyBackground = adaptiveColor(
        light: Color(red: 0.961, green: 0.957, blue: 0.941),
        dark: Color(red: 0.129, green: 0.129, blue: 0.129)
    )

    static let noteablyCard = adaptiveColor(
        light: .white,
        dark: Color(red: 0.173, green: 0.173, blue: 0.169)
    )

    static let noteablyCardElevated = adaptiveColor(
        light: Color(red: 0.98, green: 0.98, blue: 0.97),
        dark: Color(red: 0.208, green: 0.208, blue: 0.204)
    )

    // Text
    static let noteablyForeground = adaptiveColor(
        light: Color(red: 0.122, green: 0.122, blue: 0.122),
        dark: Color(red: 0.878, green: 0.875, blue: 0.863)
    )

    static let noteablySecondaryText = adaptiveColor(
        light: Color(red: 0.420, green: 0.455, blue: 0.400),
        dark: Color(red: 0.600, green: 0.620, blue: 0.580)
    )

    // Input fields
    static let noteablyInputBackground = adaptiveColor(
        light: Color(red: 0.945, green: 0.941, blue: 0.925),
        dark: Color(red: 0.165, green: 0.165, blue: 0.161)
    )

    static let noteablyBorder = adaptiveColor(
        light: Color(red: 0.878, green: 0.875, blue: 0.847),
        dark: Color(red: 0.255, green: 0.255, blue: 0.247)
    )

    // Destructive
    static let noteablyDestructive = adaptiveColor(
        light: Color(red: 0.910, green: 0.365, blue: 0.247),
        dark: Color(red: 0.910, green: 0.420, blue: 0.310)
    )

    // Success - Vibrant green for positive outcomes
    static let noteablySuccess = adaptiveColor(
        light: Color(red: 0.298, green: 0.549, blue: 0.282),
        dark: Color(red: 0.380, green: 0.659, blue: 0.365)
    )

    // Subtle tints for feature cards
    static let noteablyMint = adaptiveColor(
        light: Color(red: 0.890, green: 0.945, blue: 0.890),
        dark: Color(red: 0.180, green: 0.220, blue: 0.180)
    )

    static let noteablyAmber = adaptiveColor(
        light: Color(red: 0.965, green: 0.930, blue: 0.870),
        dark: Color(red: 0.220, green: 0.200, blue: 0.160)
    )

    static let noteablyLavender = adaptiveColor(
        light: Color(red: 0.920, green: 0.910, blue: 0.960),
        dark: Color(red: 0.190, green: 0.180, blue: 0.220)
    )
}

// MARK: - Typography

extension Font {
    /// Shrikhand display font — matches the web app's --font-serif
    static func noteablySerif(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Shrikhand-Regular", size: size)
    }

    /// Body text font
    static func noteablyBody(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    /// Monospace font for code
    static func noteablyMono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

// MARK: - Custom Button Styles

struct NoteablyPrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.noteablyBody(17, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .fill(Color.noteablyPrimary)
            )
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct NoteablySecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.noteablyBody(17, weight: .semibold))
            .foregroundStyle(Color.noteablyPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .stroke(Color.noteablyBorder, lineWidth: 1.5)
                    .background(
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                            .fill(Color.noteablyCard)
                    )
            )
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct NoteablyTextFieldStyle: ViewModifier {
    var isFocused: Bool = false

    func body(content: Content) -> some View {
        content
            .font(.noteablyBody(16))
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .fill(Color.noteablyInputBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .stroke(isFocused ? Color.noteablyPrimary : Color.noteablyBorder,
                            lineWidth: isFocused ? 2 : 1)
            )
    }
}

extension View {
    func noteablyTextField(isFocused: Bool = false) -> some View {
        modifier(NoteablyTextFieldStyle(isFocused: isFocused))
    }
}
