import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"

type Theme = "dark" | "light" | "system"

export type SetThemeOptions = { x?: number; y?: number }

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ResolvedTheme = "light" | "dark"

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme, options?: SetThemeOptions) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (typeof localStorage !== 'undefined' ? (localStorage.getItem(storageKey) as Theme) : null) || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")
  const transitionOriginRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      setResolvedTheme(systemTheme)

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const listener = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light"
        root.classList.remove("light", "dark")
        root.classList.add(newTheme)
        setResolvedTheme(newTheme)
      }
      mediaQuery.addEventListener("change", listener)
      return () => mediaQuery.removeEventListener("change", listener)
    }

    root.classList.add(theme)
    setResolvedTheme(theme)
  }, [theme])

  const setTheme = useCallback(
    (newTheme: Theme, options?: SetThemeOptions) => {
      if (typeof window !== "undefined") {
        if (options?.x !== undefined) transitionOriginRef.current.x = options.x
        if (options?.y !== undefined) transitionOriginRef.current.y = options.y
        if (
          transitionOriginRef.current.x === 0 &&
          transitionOriginRef.current.y === 0
        ) {
          transitionOriginRef.current.x = window.innerWidth / 2
          transitionOriginRef.current.y = window.innerHeight / 2
        }
      }
      const runUpdate = () => {
        localStorage.setItem(storageKey, newTheme)
        setThemeState(newTheme)
      }
      const doc = document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } }
      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => {
          flushSync(runUpdate)
        }).ready.then(() => {
          const x =
            transitionOriginRef.current.x || (typeof innerWidth !== "undefined" ? innerWidth / 2 : 0)
          const y =
            transitionOriginRef.current.y || (typeof innerHeight !== "undefined" ? innerHeight / 2 : 0)
          const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y)
          )
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 500,
              easing: "ease-in-out",
              pseudoElement: "::view-transition-new(root)",
            }
          )
        })
      } else {
        runUpdate()
      }
    },
    [storageKey]
  )

  const value = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}