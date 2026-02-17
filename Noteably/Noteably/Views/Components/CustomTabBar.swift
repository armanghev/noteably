import SwiftUI


struct CustomTabBar: View {
    @Binding var selectedTab: Int
    var onUploadTap: () -> Void
    
    var body: some View {
        HStack {
            // Tab 1: Home
            TabBarButton(
                iconName: selectedTab == 0 ? "house.fill" : "house",
                label: "Home",
                isSelected: selectedTab == 0,
                action: { selectedTab = 0 }
            )
            
            Spacer()
            
            // Tab 2: Study
            TabBarButton(
                iconName: selectedTab == 1 ? "book.fill" : "book",
                label: "Study",
                isSelected: selectedTab == 1,
                action: { selectedTab = 1 }
            )
            
            Spacer()
            
            // Tab 3: Upload (Elevated)
            Button(action: onUploadTap) {
                ZStack {
                    Circle()
                        .fill(Color.noteablyPrimary)
                        .frame(width: 56, height: 56)
                        .shadow(color: Color.noteablyPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
                    
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(Color.noteablyBackground)
                }
            }
            
            Spacer()
            
            // Tab 4: Cards
            TabBarButton(
                iconName: selectedTab == 3 ? "rectangle.fill.on.rectangle.fill" : "rectangle.on.rectangle",
                label: "Cards",
                isSelected: selectedTab == 3,
                action: { selectedTab = 3 }
            )
            
            Spacer()
            
            // Tab 5: Settings
            TabBarButton(
                iconName: selectedTab == 4 ? "gearshape.fill" : "gearshape",
                label: "Settings",
                isSelected: selectedTab == 4,
                action: { selectedTab = 4 }
            )
        }
        .padding(.horizontal, 24)
        .padding(.top, 8)
        .padding(.bottom, -12)
        .background(
            Color.noteablyBackground
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: -5)
        )
    }
}

struct TabBarButton: View {
    let iconName: String
    let label: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: iconName)
                    .font(.system(size: 24))
                
                Text(label)
                    .font(.caption2)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .foregroundColor(isSelected ? .noteablyPrimary : .gray)
            .frame(maxWidth: .infinity)
        }
    }
}


#Preview {
    CustomTabBar(selectedTab: .constant(0), onUploadTap: {})
}
