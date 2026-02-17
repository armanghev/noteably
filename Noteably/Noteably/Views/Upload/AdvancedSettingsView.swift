import SwiftUI

struct AdvancedSettingsView: View {
    @Binding var options: JobOptions
    let selectedTypes: [String]
    
    @State private var isOpen = false
    
    private var showNotesSettings: Bool { selectedTypes.contains("notes") }
    private var showQuizSettings: Bool { selectedTypes.contains("quiz") }
    private var showSummarySettings: Bool { selectedTypes.contains("summary") }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    isOpen.toggle()
                }
            } label: {
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: AppRadius.lg)
                            .fill(Color.noteablyPrimary.opacity(0.1))
                            .frame(width: 40, height: 40)
                        
                        Image(systemName: "slider.horizontal.3")
                            .foregroundStyle(Color.noteablyPrimary)
                            .font(.system(size: 18, weight: .medium))
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Advanced Settings")
                            .font(.noteablyBody(16, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)
                        
                        Text("Customize focus, format, and language")
                            .font(.noteablyBody(12))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.noteablySecondaryText)
                        .rotationEffect(.degrees(isOpen ? 180 : 0))
                }
                .padding(12)
                .background(Color.noteablyCard)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.xl))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.xl)
                        .stroke(Color.noteablyBorder.opacity(0.5), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            
            if isOpen {
                VStack(spacing: 24) {
                    // Study Focus
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.noteablyPrimary)
                            Text("Study Focus")
                                .font(.noteablyBody(14, weight: .medium))
                                .foregroundStyle(Color.noteablyForeground)
                        }
                        
                        let columns = [GridItem(.flexible()), GridItem(.flexible())]
                        LazyVGrid(columns: columns, spacing: 10) {
                            FocusButton(title: "General", desc: "Balanced mix", value: "general", selection: $options.focus)
                            FocusButton(title: "Exam Prep", desc: "Terms & dates", value: "exam", selection: $options.focus)
                            FocusButton(title: "Deep Dive", desc: "How & why", value: "deep_dive", selection: $options.focus)
                            FocusButton(title: "Simple", desc: "ELI5 style", value: "simple", selection: $options.focus)
                        }
                    }
                    
                    // Secondary Settings (Dynamic Layout)
                    SecondarySettingsDynamicGrid(options: $options, selectedTypes: selectedTypes)
                }
                .padding(.vertical, 16)
                .background(Color.noteablyBackground)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.xl))
                .padding(.top, 12)
                .transition(.opacity.combined(with: .move(edge: .top)).combined(with: .scale(0.95)))
            }
        }
    }
}

// MARK: - Secondary Settings Layout

private struct SecondarySettingsDynamicGrid: View {
    @Binding var options: JobOptions
    let selectedTypes: [String]
    
    private var showNotesSettings: Bool { selectedTypes.contains("notes") }
    private var showQuizSettings: Bool { selectedTypes.contains("quiz") }
    private var showSummarySettings: Bool { selectedTypes.contains("summary") }
    
    var body: some View {
        VStack(spacing: 24) {
            // Row 1: Language paired with either Notes Style or Quiz Difficulty
            if showNotesSettings {
                HStack(alignment: .top, spacing: 20) {
                    languageSetting
                    notesStyleSetting
                }
            } else if showQuizSettings {
                HStack(alignment: .top, spacing: 20) {
                    languageSetting
                    quizDifficultySetting
                }
            } else {
                languageSetting
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            // Row 2: Quiz Difficulty if it wasn't paired in Row 1
            if showQuizSettings && showNotesSettings {
                quizDifficultySetting
            }
            
            // Row 3: Summary Length (always full width or its own row)
            if showSummarySettings {
                summaryLengthSetting
            }
        }
    }
    
    private var languageSetting: some View {
        LanguagePickerMenu(selection: Binding(
            get: { options.language ?? "english" },
            set: { options.language = $0 }
        ))
    }
    
    private var notesStyleSetting: some View {
        NotesStylePickerMenu(selection: Binding(
            get: { options.notesStyle ?? "standard" },
            set: { options.notesStyle = $0 }
        ))
    }
    
    private var quizDifficultySetting: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Quiz Difficulty", systemImage: "sparkles")
                .font(.noteablyBody(14, weight: .medium))
                .labelStyle(SettingsLabelStyle())
            
            SegmentedToggle(selection: Binding(
                get: { options.quizDifficulty ?? "medium" },
                set: { 
                    options.quizDifficulty = $0
                    options.difficulty = $0 
                }
            ), options: ["easy", "medium", "hard"])
        }
    }
    
    private var summaryLengthSetting: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Summary Length", systemImage: "text.alignleft")
                .font(.noteablyBody(14, weight: .medium))
                .labelStyle(SettingsLabelStyle())
            
            SegmentedToggle(selection: Binding(
                get: { options.summaryLength ?? "medium" },
                set: { options.summaryLength = $0 }
            ), options: ["short", "medium", "detailed"])
        }
    }
}

// MARK: - Picker Menus

private struct LanguagePickerMenu: View {
    @Binding var selection: String
    
    let languages = ["english", "spanish", "french", "german", "italian", "portuguese", "mandarin", "japanese", "korean", "hindi"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Language", systemImage: "globe")
                .font(.noteablyBody(14, weight: .medium))
                .labelStyle(SettingsLabelStyle())
            
            Menu {
                ForEach(languages, id: \.self) { lang in
                    Button {
                        selection = lang
                    } label: {
                        HStack {
                            Text(lang.capitalized)
                            if selection == lang {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack {
                    Text(selection.capitalized)
                        .font(.noteablyBody(13))
                        .foregroundStyle(Color.noteablyForeground)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity)
                .frame(height: 38)
                .background(Color.noteablyInputBackground)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.md).stroke(Color.noteablyBorder, lineWidth: 1))
            }
        }
    }
}

private struct NotesStylePickerMenu: View {
    @Binding var selection: String
    
    let styles = ["standard", "cornell", "outline", "qa"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Notes Style", systemImage: "list.bullet.indent")
                .font(.noteablyBody(14, weight: .medium))
                .labelStyle(SettingsLabelStyle())
            
            Menu {
                ForEach(styles, id: \.self) { style in
                    Button {
                        selection = style
                    } label: {
                        HStack {
                            Text(style == "qa" ? "Q&A" : style.capitalized)
                            if selection == style {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack {
                    Text(selection == "qa" ? "Q&A" : selection.capitalized)
                        .font(.noteablyBody(13))
                        .foregroundStyle(Color.noteablyForeground)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity)
                .frame(height: 38)
                .background(Color.noteablyInputBackground)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.md).stroke(Color.noteablyBorder, lineWidth: 1))
            }
        }
    }
}

// MARK: - Base Components

private struct FocusButton: View {
    let title: String
    let desc: String
    let value: String
    @Binding var selection: String?
    
    var isSelected: Bool { (selection ?? "general") == value }
    
    var body: some View {
        Button {
            selection = value
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.noteablyBody(14, weight: .semibold))
                Text(desc)
                    .font(.noteablyBody(11))
                    .foregroundStyle(isSelected ? .white.opacity(0.8) : Color.noteablySecondaryText)
            }
            .foregroundStyle(isSelected ? .white : Color.noteablyForeground)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.lg)
                    .fill(isSelected ? Color.noteablyPrimary : Color.noteablyCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.lg)
                    .stroke(isSelected ? Color.clear : Color.noteablyBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct SegmentedToggle: View {
    @Binding var selection: String
    let options: [String]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                Button {
                    selection = option
                } label: {
                    Text(option.capitalized)
                        .font(.noteablyBody(12, weight: selection == option ? .semibold : .medium))
                        .foregroundStyle(selection == option ? Color.noteablyForeground : Color.noteablySecondaryText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(selection == option ? Color.noteablyPrimary.opacity(0.15) : Color.clear)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Color.noteablyInputBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.noteablyBorder, lineWidth: 1))
    }
}

private struct SettingsLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 6) {
            configuration.icon
                .foregroundStyle(Color.noteablyPrimary)
                .font(.system(size: 12))
            configuration.title
        }
    }
}

#if DEBUG
#Preview {
    VStack {
        AdvancedSettingsView(
            options: .constant(JobOptions(focus: "general", language: "english", summaryLength: "medium")),
            selectedTypes: ["summary"]
        )
        .padding()
        Spacer()
    }
    .background(Color.noteablyBackground)
}
#endif
