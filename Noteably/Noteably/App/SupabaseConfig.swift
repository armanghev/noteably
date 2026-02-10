import Foundation
import Supabase

enum SupabaseConfig {
    static let url = URL(string: "https://gvjiujplwwdauxwycfva.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aml1anBsd3dkYXV4d3ljZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzA0MTksImV4cCI6MjA3OTQwNjQxOX0.Ei0JH9deF3_PsW_cci0xoZYucqe6_1NBgPVn0ONxf6Q"

    static let client = SupabaseClient(
        supabaseURL: url,
        supabaseKey: anonKey
    )
}
