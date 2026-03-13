import Foundation

enum CloudProvider: String, Codable, CaseIterable {
    case googleDrive = "googleDrive"
    case dropbox = "dropbox"
    
    var displayName: String {
        switch self {
        case .googleDrive: return "Google Drive"
        case .dropbox: return "Dropbox"
        }
    }
    
    var iconName: String {
        switch self {
        case .googleDrive: return "googleDrive"
        case .dropbox: return "dropbox"
        }
    }
}

struct CloudConnection: Codable, Identifiable {
    var id: String { provider.rawValue }
    let provider: CloudProvider
    let connected: Bool
    let chooserOnly: Bool?
    
    enum CodingKeys: String, CodingKey {
        case provider
        case connected
        case chooserOnly = "chooser_only"
    }
}

struct CloudImportParams: Encodable {
    let provider: String
    let fileId: String?
    let fileLink: String?
    let materialTypes: [String]
    let options: JobOptions?
    
    enum CodingKeys: String, CodingKey {
        case provider
        case fileId = "file_id"
        case fileLink = "file_link"
        case materialTypes = "material_types"
        case options
    }
}
