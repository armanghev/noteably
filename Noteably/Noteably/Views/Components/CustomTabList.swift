import SwiftUI

struct CustomTabList<T: Hashable>: View {
    @Binding var selection: T
    let options: [T]
    let titlePath: KeyPath<T, String>
    var iconPath: KeyPath<T, String>? = nil
    var isSystemIconPath: KeyPath<T, Bool>? = nil
    var tintPath: KeyPath<T, Color?>? = nil
    
    @Namespace private var namespace
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                Button {
                    withAnimation(.snappy(duration: 0.3)) {
                        selection = option
                    }
                    
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                } label: {
                    Group {
                        if let iconPath = iconPath, let isSystemIconPath = isSystemIconPath {
                            if option[keyPath: isSystemIconPath] {
                                Image(systemName: option[keyPath: iconPath])
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundStyle(selection == option ? Color.noteablyBackground : (tintPath != nil ? (option[keyPath: tintPath!] ?? Color.noteablySecondaryText) : Color.noteablySecondaryText))
                            } else {
                                Image(option[keyPath: iconPath])
                                    .renderingMode(.original)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 20, height: 20)
                            }
                        } else {
                            Text(option[keyPath: titlePath])
                                .font(.noteablyBody(14, weight: selection == option ? .semibold : .medium))
                                .foregroundStyle(selection == option ? Color.noteablyBackground : Color.noteablySecondaryText)
                        }
                    }
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background {
                        if selection == option {
                            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                                .fill(Color.noteablyPrimary)
                                .matchedGeometryEffect(id: "selection", in: namespace)
                                .shadow(color: Color.noteablyPrimary.opacity(0.2), radius: 4, x: 0, y: 2)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(
            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                .fill(Color.noteablyPrimary.opacity(0.06))
        )
    }
}

#if DEBUG
struct CustomTabList_Previews: PreviewProvider {
    struct PreviewWrapper: View {
        @State private var selected = "First"
        let options = ["First", "Second", "Third"]
        
        var body: some View {
            CustomTabList(
                selection: $selected,
                options: options,
                titlePath: \.self
            )
            .padding()
        }
    }
    
    static var previews: some View {
        PreviewWrapper()
    }
}
#endif
