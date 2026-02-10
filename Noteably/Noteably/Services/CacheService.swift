import Foundation

// MARK: - Cache Service

final class CacheService {
    static let shared = CacheService()

    private let cacheDirectory: URL
    private let fileManager = FileManager.default

    private init() {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        cacheDirectory = appSupport.appendingPathComponent("Noteably/cache", isDirectory: true)

        // Ensure directory exists
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Write

    func save<T: Encodable>(_ object: T, forKey key: String) {
        let url = cacheDirectory.appendingPathComponent("\(key).json")
        do {
            let data = try JSONEncoder().encode(object)
            try data.write(to: url, options: .atomic)
        } catch {
            // Silently fail — cache is best-effort
        }
    }

    // MARK: - Read

    func load<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        let url = cacheDirectory.appendingPathComponent("\(key).json")
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    // MARK: - Delete

    func remove(forKey key: String) {
        let url = cacheDirectory.appendingPathComponent("\(key).json")
        try? fileManager.removeItem(at: url)
    }

    func clearAll() {
        guard let files = try? fileManager.contentsOfDirectory(at: cacheDirectory,
                                                                includingPropertiesForKeys: nil) else { return }
        for file in files {
            try? fileManager.removeItem(at: file)
        }
    }

    // MARK: - Convenience Keys

    static func contentKey(jobId: String) -> String { "content_\(jobId)" }
    static let jobsListKey = "jobs_list"
    static let dashboardKey = "dashboard"
}
